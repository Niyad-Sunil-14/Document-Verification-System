import os
import json
import logging
import tempfile
import threading
from datetime import timedelta

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import razorpay
import cloudinary
import cloudinary.uploader
import environ

from django.conf import settings
from django.db import transaction, connection, close_old_connections
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import PageNumberPagination

from .models import Document, Notification, Payment, CustomUser
from .serializers import (
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentUploadSerializer,
    NotificationSerializer
)
from .utils import (
    extract_text_from_pdf, 
    extract_ocr_text, 
    evaluate_document_verification, 
    estimate_processing_time
)

logger = logging.getLogger(__name__)
env = environ.Env()

# Initialize Razorpay Client cleanly before view usages
razorpay_client = razorpay.Client(
    auth=(
        getattr(settings, 'RAZORPAY_KEY_ID', ''), 
        getattr(settings, 'RAZORPAY_KEY_SECRET', '')
    )
)


def process_ocr_in_background(document_id, temp_file_path, is_pdf):
    """
    Background Thread Worker:
    - Closes old/stale connections to prevent DB operational timeouts inside thread execution.
    - Performs OCR text extraction (handling both digital and scanned PDF conversions).
    - Evaluates verification rules, updates Document record, and notifies the user.
    """
    close_old_connections()
    try:
        doc = Document.objects.get(id=document_id)
        extracted_text = ""
        accuracy_score = 0.0
        ocr_pipeline_status = "FAILED"

        # -------------------------------------------------------------
        # TEXT EXTRACTION PHASE
        # -------------------------------------------------------------
        if is_pdf:
            extracted_text = extract_text_from_pdf(temp_file_path)
            if extracted_text.strip():
                ocr_pipeline_status = "PROCESSED"
                accuracy_score = 95.0
            else:
                # Scanned PDF fallback using pdf2image -> pytesseract
                try:
                    images = convert_from_path(temp_file_path)
                    combined_text = ""
                    confidences = []
                    
                    for img in images:
                        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                        combined_text += pytesseract.image_to_string(img) + "\n"
                        confidences.extend([int(c) for c in data['conf'] if int(c) > 0])
                        
                    extracted_text = combined_text.strip()
                    accuracy_score = float(np.mean(confidences)) if confidences else 50.0
                    ocr_pipeline_status = "PROCESSED" if extracted_text else "FAILED"
                except Exception as pdf_ocr_err:
                    logger.error(f"Scanned PDF OCR failed: {pdf_ocr_err}")
        else:
            # Use extract_ocr_text directly for image uploads
            ocr_result = extract_ocr_text(
                image_input=temp_file_path,
                psm=11,
                whitelist='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/:.- '
            )
            extracted_text = ocr_result["extracted_text"]
            accuracy_score = ocr_result["confidence"]
            ocr_pipeline_status = "PROCESSED" if extracted_text else "FAILED"

        # -------------------------------------------------------------
        # VERIFICATION EVALUATION ENGINE
        # -------------------------------------------------------------
        final_status, remarks, is_auto_verified = evaluate_document_verification(
            extracted_text=extracted_text,
            document_type=doc.document_type,
            ocr_accuracy=accuracy_score,
            pipeline_status=ocr_pipeline_status
        )

        # -------------------------------------------------------------
        # DATABASE UPDATE & NOTIFICATION
        # -------------------------------------------------------------
        doc.extracted_text = extracted_text
        doc.ocr_accuracy = round(accuracy_score, 2)
        doc.ocr_status = "PROCESSED" if ocr_pipeline_status == "PROCESSED" else "FAILED"
        doc.status = final_status
        doc.remarks = remarks
        doc.auto_verified = is_auto_verified
        doc.save()

        Notification.objects.create(
            user=doc.user,
            title=f"Document Verification {final_status}",
            description=f"Verification for '{doc.filename}' complete. Status: {final_status}.",
            document=doc,
            is_read=False
        )

    except Exception as e:
        logger.error(f"Error in OCR background processing thread: {str(e)}")
        try:
            doc = Document.objects.get(id=document_id)
            doc.ocr_status = "FAILED"
            doc.remarks = f"Processing system error: {str(e)}"
            doc.save()
        except Exception:
            pass

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        close_old_connections()


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        user = request.user
        use_credit = request.data.get('use_credit') == 'true'
        
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        rzp_order_id = serializer.validated_data.get('razorpay_order_id')
        rzp_payment_id = serializer.validated_data.get('razorpay_payment_id')

        # Credit Validation Layer
        if use_credit:
            with transaction.atomic():
                current_user = CustomUser.objects.select_for_update().get(id=user.id)
                credits_available = getattr(current_user, 'document_credits', 0)
                if credits_available <= 0:
                    return Response(
                        {"detail": "Insufficient credits available."},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )
                current_user.document_credits -= 1
                current_user.save()

        uploaded_file = request.FILES['file']
        document_type = serializer.validated_data.get('document_type', '')
        original_filename = uploaded_file.name
        file_size_bytes = uploaded_file.size
        is_pdf_file = original_filename.lower().endswith('.pdf')

        time_estimation = estimate_processing_time(is_pdf_file, file_size_bytes)

        suffix = os.path.splitext(original_filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_filename = temp_file.name

        uploaded_file.seek(0)

        try:
            upload_result = cloudinary.uploader.upload(
                uploaded_file,
                folder="user_documents/",
                resource_type="raw" if is_pdf_file else "image"
            )
            secure_url = upload_result.get("secure_url")

            document = Document.objects.create(
                user=request.user,
                document_type=document_type,
                file=secure_url,
                filename=original_filename, 
                status="PENDING",
                ocr_status="PROCESSING",
                ocr_accuracy=0.0,
                estimated_seconds=time_estimation["estimated_seconds"],
                razorpay_order_id=rzp_order_id or "",
                razorpay_payment_id=rzp_payment_id or "",
                payment_verified=True
            )

            threading.Thread(
                target=process_ocr_in_background,
                args=(document.id, temp_filename, is_pdf_file)
            ).start()

            return Response(
                {
                    "id": document.id, 
                    "document_type": document.document_type,
                    "file": document.file, 
                    "filename": original_filename,
                    "status": document.status,
                    "ocr_status": document.ocr_status,
                    "estimated_seconds": document.estimated_seconds,
                    "estimated_time_formatted": time_estimation["estimated_time_formatted"]
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as err:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            return Response({"error": str(err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = Document.objects.filter(user=request.user).aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='PENDING')),
            approved=Count('id', filter=Q(status='APPROVED')),
            rejected=Count('id', filter=Q(status='REJECTED'))
        )

        return Response({
            "total": stats['total'] or 0,
            "pending": stats['pending'] or 0,
            "approved": stats['approved'] or 0,
            "rejected": stats['rejected'] or 0,
        })


class DocumentStandardPagination(PageNumberPagination):
    page_size = 10                  
    page_size_query_param = 'size'  
    max_page_size = 100


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentListSerializer

    def get(self, request, *args, **kwargs):
        if request.user.is_staff:
            queryset = Document.objects.all()
            ITEMS_PER_PAGE = 10
        else:
            queryset = Document.objects.filter(user=request.user)
            ITEMS_PER_PAGE = 12

        status_filter = request.query_params.get('status', 'ALL')
        search_term = request.query_params.get('search', '').strip()
        limit_param = request.query_params.get('limit')
        
        try:
            page_num = int(request.query_params.get('page', 1))
            if page_num < 1:
                page_num = 1
        except (ValueError, TypeError):
            page_num = 1

        if status_filter != 'ALL':
            queryset = queryset.filter(Q(status=status_filter) | Q(ocr_status=status_filter))

        if search_term:
            queryset = queryset.filter(
                Q(user__email__icontains=search_term) |
                Q(user__fullname__icontains=search_term) |
                Q(document_type__icontains=search_term) |
                Q(filename__icontains=search_term)
            )

        queryset = queryset.order_by('-uploaded_at')
        total_count = queryset.count()

        if limit_param and limit_param.isdigit():
            limit = int(limit_param)
            paginated_queryset = queryset[:limit]
            serializer = self.serializer_class(paginated_queryset, many=True)
            return Response({
                "count": total_count,
                "next": False,
                "previous": False,
                "results": serializer.data
            }, status=status.HTTP_200_OK)

        start_index = (page_num - 1) * ITEMS_PER_PAGE
        end_index = start_index + ITEMS_PER_PAGE

        paginated_queryset = queryset[start_index:end_index]
        serializer = self.serializer_class(paginated_queryset, many=True)

        return Response({
            "count": total_count,
            "next": end_index < total_count,
            "previous": page_num > 1,
            "results": serializer.data
        }, status=status.HTTP_200_OK)


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            doc_id = kwargs.get('id') or kwargs.get('pk')
            document = Document.objects.get(id=doc_id)
            serializer = DocumentDetailSerializer(document, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Document.DoesNotExist:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, *args, **kwargs):
        try:
            doc_id = kwargs.get('id') or kwargs.get('pk')
            document = Document.objects.get(id=doc_id)
            
            if not request.user.is_staff and not request.user.is_superuser:
                if document.user != request.user:
                    return Response({"detail": "Permission Denied."}, status=status.HTTP_403_FORBIDDEN)
                if document.status != "REJECTED":
                    return Response({"detail": "Only rejected documents can be replaced."}, status=status.HTTP_400_BAD_REQUEST)

            # Re-upload handling
            if 'file' in request.FILES:
                uploaded_file = request.FILES['file']
                original_filename = uploaded_file.name
                is_pdf_file = original_filename.lower().endswith('.pdf')

                suffix = os.path.splitext(original_filename)[1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                    for chunk in uploaded_file.chunks():
                        temp_file.write(chunk)
                    temp_filename = temp_file.name

                uploaded_file.seek(0)

                upload_result = cloudinary.uploader.upload(
                    uploaded_file, folder="user_documents/", resource_type="raw" if is_pdf_file else "image"
                )
                secure_url = upload_result.get("secure_url")

                with transaction.atomic():
                    document.file = secure_url
                    document.filename = original_filename
                    document.status = "PENDING"
                    document.ocr_status = "PROCESSING"
                    document.remarks = ""
                    document.auto_verified = False
                    document.save()

                Notification.objects.create(
                    user=document.user,
                    title="🔄 Document Re-uploaded",
                    description=f"You replaced the rejected file with a new copy of {original_filename}.",
                    document=document
                )

                threading.Thread(
                    target=process_ocr_in_background,
                    args=(document.id, temp_filename, is_pdf_file)
                ).start()

                serializer = DocumentDetailSerializer(document, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

            # Metadata update handling (Admin review)
            serializer = DocumentDetailSerializer(document, data=request.data, partial=True, context={'request': request})
            old_status = document.status
            
            if serializer.is_valid():
                updated_document = serializer.save()
                updated_document.auto_verified = False
                updated_document.save(update_fields=['auto_verified'])
                
                new_status = updated_document.status
                admin_remarks = updated_document.remarks or ""
                doc_type_clean = (updated_document.document_type or "Document").replace('_', ' ').title()

                if old_status != new_status:
                    if new_status == "APPROVED":
                        notification_title = f"✅ {doc_type_clean} Approved"
                        notification_desc = f"Your uploaded {doc_type_clean.lower()} has been verified secure by our compliance team."
                    elif new_status == "REJECTED":
                        notification_title = f"❌ {doc_type_clean} Rejected"
                        notification_desc = f"Your uploaded {doc_type_clean.lower()} failed our clearance checks."
                    else:
                        notification_title = f"ℹ️ {doc_type_clean} Status Updated"
                        notification_desc = f"Your document status has been updated to {new_status}."
                else:
                    notification_title = f"💬 Audit Notes Appended: {doc_type_clean}"
                    notification_desc = "An administrator has added review remarks to your document registration profile."

                if admin_remarks:
                    notification_desc += f" Remarks: \"{admin_remarks}\""

                Notification.objects.create(
                    user=updated_document.user,
                    title=notification_title,
                    description=notification_desc,
                    is_read=False
                )
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Document.DoesNotExist:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        
        if request.query_params.get('unread_only') == 'true':
            notifications = notifications.filter(is_read=False)
            
        limit = request.query_params.get('limit')
        if limit:
            try:
                notifications = notifications[:int(limit)]
            except ValueError:
                pass
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)


class AdminDashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {"detail": "Authorization Fault: Lacks elevated clearance."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        metrics = Document.objects.aggregate(
            total_documents=Count('id'),
            pending_documents=Count('id', filter=Q(status='PENDING')),
            approved_documents=Count('id', filter=Q(status='APPROVED')),
            rejected_documents=Count('id', filter=Q(status='REJECTED')),
            ocr_processed=Count('id', filter=Q(ocr_status='PROCESSED')),
            ocr_failed=Count('id', filter=Q(ocr_status='FAILED'))
        )

        total_users = CustomUser.objects.filter(is_staff=False, is_superuser=False).count()

        return Response({
            "totalUsers": total_users,
            "totalDocuments": metrics['total_documents'],
            "pendingDocuments": metrics['pending_documents'],
            "approvedDocuments": metrics['approved_documents'],
            "rejectedDocuments": metrics['rejected_documents'],
            "ocrProcessed": metrics['ocr_processed'],
            "ocrFailed": metrics['ocr_failed']
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        webhook_body = request.body
        received_signature = request.headers.get('X-Razorpay-Signature', '')
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')

        try:
            razorpay_client.utility.verify_webhook_signature(
                webhook_body.decode('utf-8'), 
                received_signature, 
                webhook_secret
            )
        except Exception as sig_err:
            logger.error(f"Razorpay webhook signature mismatch: {sig_err}")
            return Response({"detail": "Signature integrity verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_data = json.loads(webhook_body.decode('utf-8'))
            event_type = event_data.get('event')
            payload = event_data.get('payload', {})

            if event_type in ["order.paid", "payment.captured"]:
                payment_entity = payload.get('payment', {}).get('entity', {})
                razorpay_order_id = payment_entity.get('order_id')
                razorpay_payment_id = payment_entity.get('id')
                razorpay_signature = payment_entity.get('signature', '')
                
                Payment.objects.filter(razorpay_order_id=razorpay_order_id).update(
                    status='SUCCESS',
                    razorpay_payment_id=razorpay_payment_id,
                    razorpay_signature=razorpay_signature
                )

            elif event_type == "payment.failed":
                payment_entity = payload.get('payment', {}).get('entity', {})
                razorpay_order_id = payment_entity.get('order_id')
                razorpay_payment_id = payment_entity.get('id')
                
                Payment.objects.filter(razorpay_order_id=razorpay_order_id).update(
                    status='FAILED',
                    razorpay_payment_id=razorpay_payment_id
                )

            return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)

        except Exception as parse_err:
            logger.error(f"Error handling webhook payload: {parse_err}")
            return Response({"detail": "Internal processing failure."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RazorpayOrderCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        amount_in_rupees = 49
        amount_in_paisa = amount_in_rupees * 100 
        currency = "INR"

        order_data = {
            "amount": amount_in_paisa,
            "currency": currency,
            "payment_capture": 1
        }

        try:
            razorpay_order = razorpay_client.order.create(data=order_data)
            return Response({
                "order_id": razorpay_order["id"],
                "amount": amount_in_paisa,
                "currency": currency,
                "razorpay_key_id": getattr(settings, 'RAZORPAY_KEY_ID', ''),
                "user_details": {
                    "fullname": getattr(request.user, "fullname", ""),
                    "email": request.user.email
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"detail": f"Failed to open clearing instance with Razorpay: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SubscriptionDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        latest_payment = Payment.objects.filter(
            user=user,
            status='SUCCESS',
            plan_type__in=['STARTER_PACK', 'MONTHLY_PREMIUM']
        ).order_by('-created_at').first()

        is_active = False
        expires_at = None
        current_plan = "PAY_AS_YOU_VERIFY"

        sub_expires = getattr(user, 'subscription_expires_at', None)
        if sub_expires and sub_expires > timezone.now():
            is_active = True
            expires_at = sub_expires
            if latest_payment:
                current_plan = latest_payment.plan_type
        else:
            if getattr(user, 'is_subscribed', False):
                user.is_subscribed = False
                user.save()

        return Response({
            "plan_type": current_plan,
            "is_active": is_active,
            "is_canceled": not is_active,
            "expires_at": expires_at
        }, status=status.HTTP_200_OK)


class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        payment_id = request.data.get('payment_id')
        plan_type = request.data.get('plan_type')

        target_payment = None

        if payment_id:
            target_payment = Payment.objects.filter(id=payment_id, user=user).first()
        elif plan_type:
            target_payment = Payment.objects.filter(
                user=user, 
                plan_type=plan_type.upper(), 
                status='SUCCESS'
            ).order_by('-created_at').first()

        if target_payment:
            target_payment.is_cancelled = True
            target_payment.save()
            canceled_plan_label = target_payment.get_plan_type_display() if hasattr(target_payment, 'get_plan_type_display') else target_payment.plan_type
        else:
            canceled_plan_label = "Subscription Plan"

        active_remaining_payments = Payment.objects.filter(
            user=user,
            status='SUCCESS',
            is_cancelled=False,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).exists()

        if not active_remaining_payments and hasattr(user, 'is_subscribed'):
            user.is_subscribed = False
            user.save()

        Notification.objects.create(
            user=user,
            title="🛑 Subscription Renewal Cancelled",
            description=f"Auto-renewal for your {canceled_plan_label.replace('_', ' ').title()} has been disabled."
        )

        return Response({
            "detail": f"Subscription for {canceled_plan_label} was successfully cancelled."
        }, status=status.HTTP_200_OK)


class CreateSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            user = request.user
            plan_type = request.data.get('plan_type', 'monthly_premium')
            
            if plan_type == 'starter_pack':
                amount_in_rupees = 99
            else:
                amount_in_rupees = 299
                
            amount_in_paisa = amount_in_rupees * 100  
            currency = "INR"

            order_data = {
                "amount": amount_in_paisa,
                "currency": currency,
                "payment_capture": 1,
                "notes": {
                    "user_id": str(user.id),
                    "fullname": getattr(user, 'fullname', ''),
                    "plan_type": plan_type  
                }
            }

            razorpay_order = razorpay_client.order.create(data=order_data)

            Payment.objects.create(
                user=user,
                plan_type=plan_type.upper(),
                amount=amount_in_rupees,
                currency=currency,
                status='PENDING',
                razorpay_order_id=razorpay_order['id']
            )

            return Response({
                "order_id": razorpay_order['id'],
                "amount": amount_in_paisa,
                "currency": currency,
                "key_id": getattr(settings, 'RAZORPAY_KEY_ID', ''),
                "user_details": {
                    "fullname": getattr(user, 'fullname', ''),
                    "email": user.email
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Subscription creation error: {str(e)}")
            return Response(
                {"detail": f"An unexpected error blocked transaction initiation: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class VerifySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            razorpay_order_id = request.data.get('razorpay_order_id') 
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')

            verification_payload = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }

            try:
                razorpay_client.utility.verify_payment_signature(verification_payload)
            except razorpay.errors.SignatureVerificationError:
                Payment.objects.filter(razorpay_order_id=razorpay_order_id).update(status='FAILED')
                return Response({"detail": "Cryptographic signature validation check failed."}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            rzp_order = razorpay_client.order.fetch(razorpay_order_id)
            plan_type = rzp_order.get('notes', {}).get('plan_type', 'monthly_premium')

            if hasattr(user, 'is_subscribed'):
                user.is_subscribed = True

            Payment.objects.filter(razorpay_order_id=razorpay_order_id).update(
                status='SUCCESS',
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature
            )
            
            credits_to_add = 3 if plan_type == 'starter_pack' else 12
            plan_display_name = "Starter Pack" if plan_type == 'starter_pack' else "Monthly Premium Pass"

            if hasattr(user, 'document_credits'):
                user.document_credits += credits_to_add

            sub_expires = getattr(user, 'subscription_expires_at', None)
            if sub_expires and sub_expires > timezone.now():
                user.subscription_expires_at = sub_expires + timedelta(days=30)
            else:
                user.subscription_expires_at = timezone.now() + timedelta(days=30)

            user.save()

            Notification.objects.create(
                user=user,
                title="💳 Subscription Activated",
                description=f"Your {plan_display_name} is live! Document upload credits updated successfully."
            )

            return Response({"status": "Subscription confirmed successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentHistoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        payments = Payment.objects.filter(
            user=request.user, 
            status__in=['SUCCESS', 'FAILED']
        ).select_related('document')
        
        data = []
        for payment in payments:
            data.append({
                "id": payment.id,
                "plan_type": payment.plan_type,
                "amount": float(payment.amount),
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment.razorpay_payment_id if payment.razorpay_payment_id else "N/A",
                "created_at": payment.created_at.strftime("%Y-%m-%d %H:%M"),
                "status": payment.status,
                "is_cancelled": getattr(payment, 'is_cancelled', False),
                "filename": payment.document.filename if payment.document else "Subscription Plan"
            })
            
        return Response(data, status=status.HTTP_200_OK)


class LogPaymentFailureView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        order_id = request.data.get('razorpay_order_id')
        plan_type = request.data.get('plan_type', 'PAY_AS_YOU_VERIFY').upper()

        if not order_id:
            return Response({"detail": "Missing order reference mapping."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            payment, created = Payment.objects.update_or_create(
                razorpay_order_id=order_id,
                defaults={
                    "user": request.user,
                    "plan_type": plan_type,
                    "amount": 49.00 if plan_type == 'PAY_AS_YOU_VERIFY' else (99.00 if plan_type == 'STARTER_PACK' else 299.00),
                    "status": 'FAILED'
                }
            )

            Notification.objects.create(
                user=request.user,
                title="⚠️ Payment Failed",
                description=(
                    f"Your checkout run for the {plan_type.replace('_', ' ').title()} pass was unsuccessful. "
                    f"{'No credits were added.' if plan_type != 'PAY_AS_YOU_VERIFY' else 'No charges were made.'}"
                ),
                is_read=False
            )

        return Response({"status": "Failure log and alert notification captured"}, status=status.HTTP_201_CREATED)


class PaymentDetailRetrieveView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, id, *args, **kwargs):
        try:
            payment = Payment.objects.select_related('document').get(id=id, user=request.user)
            
            return Response({
                "id": payment.id,
                "plan_type": payment.plan_type,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
                "razorpay_order_id": payment.razorpay_order_id,
                "razorpay_payment_id": payment.razorpay_payment_id,
                "created_at": payment.created_at.strftime("%B %d, %Y at %I:%M %p"),
                "document_id": payment.document.id if payment.document else None,
                "filename": payment.document.filename if payment.document else "Subscription Plan"
            }, status=status.HTTP_200_OK)
            
        except Payment.DoesNotExist:
            return Response({"detail": "Transaction matching specified lookup parameters was not found."}, status=status.HTTP_404_NOT_FOUND)