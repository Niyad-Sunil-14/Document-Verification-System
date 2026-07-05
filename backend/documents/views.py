import logging
import tempfile  
import cloudinary 
import environ    
import json

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import cloudinary.uploader
import pytesseract
from pytesseract import Output
from pdf2image import convert_from_path 
import cv2
import numpy as np
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from django.conf import settings
import razorpay
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import timedelta
from rest_framework.generics import RetrieveAPIView


import os
from .models import Document,Notification,Payment
from .serializers import (
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentUploadSerializer,
    NotificationSerializer
)
from .utils import extract_text_from_pdf, preprocess_image_for_ocr

logger = logging.getLogger(__name__)

def pil_to_opencv(pil_image):
    return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

env = environ.Env()

import os
import tempfile
import cv2
import pytesseract
from pytesseract import Output
from pdf2image import convert_from_path
import cloudinary
import cloudinary.uploader
import razorpay
from django.conf import settings
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document, Payment, Notification  # 🚀 Added Notification import

# Keep your logger and pre-processing utility imports/functions here...

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        user = request.user
        
        # Check if the frontend requested to skip the gateway via an available credit token
        use_credit = request.data.get('use_credit') == 'true'
        
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # =================================================================
        # STEP A: BILLING SECURITY & CREDIT BALANCE GUARD LAYER
        # =================================================================
        rzp_order_id = serializer.validated_data.get('razorpay_order_id')
        rzp_payment_id = serializer.validated_data.get('razorpay_payment_id')
        rzp_signature = serializer.validated_data.get('razorpay_signature')

        if use_credit:
            with transaction.atomic():
                current_user = request.user.__class__.objects.select_for_update().get(id=user.id)
                
                if current_user.document_credits <= 0:
                    return Response(
                        {"detail": "Out of account credits. Please purchase a plan or use Pay-As-You-Verify."},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )

                current_user.document_credits -= 1
                current_user.save()
                logger.info(f"🪙 1 Account credit token deducted for User ID: {user.id}")
        else:
            if not user.is_subscribed and user.document_credits <= 0:
                if not all([rzp_order_id, rzp_payment_id, rzp_signature]):
                    return Response(
                        {"detail": "Out of verification credits. Please upgrade your plan or pay per single verification loop."},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )
            
            if all([rzp_order_id, rzp_payment_id, rzp_signature]):
                try:
                    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                    verification_payload = {
                        'razorpay_order_id': rzp_order_id,
                        'razorpay_payment_id': rzp_payment_id,
                        'razorpay_signature': rzp_signature
                    }
                    client.utility.verify_payment_signature(verification_payload)
                    logger.info(f"🛡️ Razorpay Payment verified for Order ID: {rzp_order_id}")
                except Exception as pay_err:
                    logger.error(f"🚨 Payment Signature Integrity Check Failed: {pay_err}")
                    return Response(
                        {"detail": "Payment security validation signature mismatch. Processing terminated."}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # =================================================================
        # STEP B: CORE OCR PIPELINE MANAGEMENT
        # =================================================================
        uploaded_file = request.FILES['file']
        document_type = serializer.validated_data.get('document_type', '')
        original_filename = uploaded_file.name
        
        is_pdf_file = original_filename.lower().endswith('.pdf')
        text = ""
        ocr_accuracy_score = 0.0
        ocr_pipeline_status = "PENDING"
        
        temp_filename = None
        try:
            suffix = os.path.splitext(original_filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
                temp_filename = temp_file.name

            processed_image = None

            if is_pdf_file:
                logger.info(f"Converting PDF {original_filename} pages to image elements...")
                pages = convert_from_path(temp_filename, first_page=1, last_page=1)
                
                if pages:
                    opencv_img = pil_to_opencv(pages[0])
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as img_temp:
                        cv2.imwrite(img_temp.name, opencv_img)
                        processed_image = preprocess_image_for_ocr(img_temp.name)
                        try:
                            os.remove(img_temp.name)
                        except:
                            pass
            else:
                processed_image = preprocess_image_for_ocr(temp_filename)

            if processed_image is not None:
                text = pytesseract.image_to_string(processed_image)
                ocr_data = pytesseract.image_to_data(processed_image, output_type=Output.DICT)
                
                valid_confidences = [int(c) for c in ocr_data['conf'] if int(c) > -1]
                if valid_confidences:
                    calculated_accuracy = sum(valid_confidences) / len(valid_confidences)
                    ocr_accuracy_score = round(calculated_accuracy, 2)
                    ocr_pipeline_status = "PROCESSED"
                else:
                    ocr_pipeline_status = "FAILED"
            else:
                ocr_pipeline_status = "FAILED"

        except Exception as ocr_err:
            logger.error(f"OCR Pipeline failed: {ocr_err}")
            ocr_accuracy_score = 0.0
            ocr_pipeline_status = "FAILED"
        
        finally:
            if temp_filename and os.path.exists(temp_filename):
                try:
                    os.remove(temp_filename)
                except Exception as e:
                    logger.error(f"Failed to delete temp file {temp_filename}: {e}")

        uploaded_file.seek(0)

        # =================================================================
        # STEP C: STORAGE ROUTING & MODEL RECORD ENTRIES
        # =================================================================
        try:
            cloudinary.config(
                cloud_name=env('CLOUDINARY_CLOUD_NAME'),
                api_key=env('CLOUDINARY_API_KEY'),
                api_secret=env('CLOUDINARY_API_SECRET'),
                secure=True
            )
            
            determined_resource_type = "raw" if is_pdf_file else "image"
            logger.info(f"Uploading file {original_filename} to Cloudinary...")
            
            upload_result = cloudinary.uploader.upload(
                uploaded_file,
                folder="user_documents/",
                resource_type=determined_resource_type
            )
            
            secure_url = upload_result.get("secure_url")
            
            with transaction.atomic():
                document = Document.objects.create(
                    user=request.user,
                    document_type=document_type,
                    file=secure_url,
                    filename=original_filename, 
                    status="PENDING",
                    ocr_status=ocr_pipeline_status,
                    ocr_accuracy=ocr_accuracy_score,
                    extracted_text=text.strip() if text else "",
                    razorpay_order_id=rzp_order_id if rzp_order_id else "",
                    razorpay_payment_id=rzp_payment_id if rzp_payment_id else "",
                    payment_verified=True
                )

                if not use_credit:
                    # 1. Create the payment record entry tracking row
                    Payment.objects.create(
                        user=request.user,
                        plan_type='PAY_AS_YOU_VERIFY',
                        amount=49.00,
                        status='SUCCESS',
                        razorpay_order_id=rzp_order_id,
                        razorpay_payment_id=rzp_payment_id,
                        razorpay_signature=rzp_signature,
                        document=document
                    )
                    
                    # 🚀 2. FIRE SUCCESS NOTIFICATION (Only runs for Pay-As-You-Verify paths)
                    # The title matching structure maps perfectly to your new credit card layout icon!
                    Notification.objects.create(
                        user=request.user,
                        title="✅ Payment Success",
                        description=f"Payment received for verifying '{original_filename}'. The document analysis has been started.",
                        document=document,
                        is_read=False
                    )    
        
            logger.info(f"🎉 File {original_filename} successfully saved and marked as PROCESSED in database.")

            return Response(
                {
                    "id": document.id, 
                    "document_type": document.document_type,
                    "file": document.file, 
                    "filename": original_filename,
                    "status": document.status,
                    "payment_verified": True
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as upload_error:
            logger.error(f"Cloudinary upload failed: {upload_error}")
            return Response(
                {"error": f"Cloudinary upload failed: {str(upload_error)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 



class DocumentStandardPagination(PageNumberPagination):
    page_size = 10                  
    page_size_query_param = 'size'  
    max_page_size = 100

class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentListSerializer

    def get(self, request, *args, **kwargs):
        # 1. Base Queryset Filter by Role Access
        if request.user.is_staff:
            queryset = Document.objects.all()
            ITEMS_PER_PAGE = 10  # 💻 Admin side keeps 10 rows per page
        else:
            queryset = Document.objects.filter(user=request.user)
            ITEMS_PER_PAGE = 12  # 🚀 User side gets exactly 12 documents per page!

        # 2. Extract Query Parameters
        status_filter = request.query_params.get('status', 'ALL')
        search_term = request.query_params.get('search', '').strip()
        
        try:
            page_num = int(request.query_params.get('page', 1))
            if page_num < 1:
                page_num = 1
        except (ValueError, TypeError):
            page_num = 1

        # 3. Apply Filters to the Queryset
        if status_filter != 'ALL':
            queryset = queryset.filter(Q(status=status_filter) | Q(ocr_status=status_filter))

        if search_term:
            queryset = queryset.filter(
                Q(user__email__icontains=search_term) |
                Q(user__fullname__icontains=search_term) |
                Q(document_type__icontains=search_term) |
                Q(filename__icontains=search_term)
            )

        # Order by newest uploads
        queryset = queryset.order_by('-uploaded_at')

        # 4. Calculate Dynamic Slicing
        total_count = queryset.count()
        start_index = (page_num - 1) * ITEMS_PER_PAGE
        end_index = start_index + ITEMS_PER_PAGE

        paginated_queryset = queryset[start_index:end_index]

        has_next = end_index < total_count
        has_previous = page_num > 1

        serializer = self.serializer_class(paginated_queryset, many=True)

        return Response({
            "count": total_count,
            "next": has_next,
            "previous": has_previous,
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
            
            # 🛡️ 1. Security check for standard users
            if not request.user.is_staff and not request.user.is_superuser:
                if document.user != request.user:
                    return Response({"detail": "Permission Denied."}, status=status.HTTP_403_FORBIDDEN)
                if document.status != "REJECTED":
                    return Response({"detail": "Only rejected documents can be replaced."}, status=status.HTTP_400_BAD_REQUEST)

            # 🔥 2. HANDLE FILE RE-UPLOAD REPLACEMENT WORKFLOW
            if 'file' in request.FILES:
                uploaded_file = request.FILES['file']
                original_filename = uploaded_file.name
                is_pdf_file = original_filename.lower().endswith('.pdf')
                
                text = ""
                ocr_accuracy_score = 0.0
                ocr_pipeline_status = "PENDING"
                
                # Run OCR pipeline logic...
                temp_filename = None
                try:
                    suffix = os.path.splitext(original_filename)[1]
                    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                        for chunk in uploaded_file.chunks():
                            temp_file.write(chunk)
                        temp_filename = temp_file.name

                    processed_image = None
                    if is_pdf_file:
                        pages = convert_from_path(temp_filename, first_page=1, last_page=1)
                        if pages:
                            opencv_img = pil_to_opencv(pages[0])
                            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as img_temp:
                                cv2.imwrite(img_temp.name, opencv_img)
                                processed_image = preprocess_image_for_ocr(img_temp.name)
                                try: os.remove(img_temp.name)
                                except: pass
                    else:
                        processed_image = preprocess_image_for_ocr(temp_filename)

                    if processed_image is not None:
                        tesseract_config = r'--psm 6'
                        text = pytesseract.image_to_string(processed_image, config=tesseract_config)
                        ocr_data = pytesseract.image_to_data(processed_image, output_type=Output.DICT, config=tesseract_config)
                        valid_confidences = [int(c) for c in ocr_data['conf'] if int(c) > -1]
                        if valid_confidences:
                            ocr_accuracy_score = round(sum(valid_confidences) / len(valid_confidences), 2)
                            ocr_pipeline_status = "PROCESSED"
                        else:
                            ocr_pipeline_status = "FAILED"
                    else:
                        ocr_pipeline_status = "FAILED"
                except Exception as ocr_err:
                    logger.error(f"Re-upload OCR Failed: {ocr_err}")
                    ocr_pipeline_status = "FAILED"
                finally:
                    if temp_filename and os.path.exists(temp_filename):
                        try: os.remove(temp_filename)
                        except: pass

                # Upload payload directly to Cloudinary
                uploaded_file.seek(0)
                cloudinary.config(
                    cloud_name=env('CLOUDINARY_CLOUD_NAME'),
                    api_key=env('CLOUDINARY_API_KEY'),
                    api_secret=env('CLOUDINARY_API_SECRET'),
                    secure=True
                )
                determined_resource_type = "raw" if is_pdf_file else "image"
                upload_result = cloudinary.uploader.upload(
                    uploaded_file, folder="user_documents/", resource_type=determined_resource_type
                )
                secure_url = upload_result.get("secure_url")

                # Save changes over the original database instance
                with transaction.atomic():
                    document.file = secure_url
                    document.filename = original_filename
                    document.status = "PENDING"
                    document.ocr_status = ocr_pipeline_status
                    document.ocr_accuracy = ocr_accuracy_score
                    document.extracted_text = text.strip() if text else ""
                    document.remarks = ""
                    document.save()
                
                Notification.objects.create(
                    user=document.user,
                    title="🔄 Document Re-uploaded",
                    description=f"You replaced the rejected file with a new copy of {original_filename}.",
                    document=document
                )

                # 🔥 CRITICAL FIX: Explicitly return here to terminate file updates with a valid Response!
                serializer = DocumentDetailSerializer(document, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

            # 🛠️ 3. HANDLE METADATA UPDATE WORKFLOW (Admin approval/rejection edits)
            serializer = DocumentDetailSerializer(document, data=request.data, partial=True, context={'request': request})
            old_status = document.status
            
            if serializer.is_valid():
                # Save updates to the document (status, remarks, etc.)
                updated_document = serializer.save()
                
                # Fetch clean references of the updated data
                new_status = updated_document.status
                admin_remarks = updated_document.remarks or ""
                doc_type_clean = (updated_document.document_type or "Document").replace('_', ' ').title()

                # 🔥 AUTOMATION LAYER: Send custom notifications based on the action taken
                notification_title = ""
                notification_desc = ""
                if old_status != new_status:
                    # Case A: Admin altered the verification status
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
                    # Case B: Admin only updated/sent audit remarks notes without changing status
                    notification_title = f"💬 Audit Notes Appended: {doc_type_clean}"
                    notification_desc = "An administrator has added review remarks to your document registration profile."

                # If there are remarks, append them neatly to the notification body
                if admin_remarks:
                    notification_desc += f" Remarks: \"{admin_remarks}\""

                # Save the new notification targeting the document owner
                Notification.objects.create(
                    user=updated_document.user,  # 🔥 Crucial: Routes directly to the user who owns the file
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
        notifications = Notification.objects.filter(user=request.user)
        if request.query_params.get('unread_only') == 'true':
            notifications = notifications.filter(is_read=False)
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)





# ADMIN SIDE
from django.db.models import Count, Q
from .models import Document,CustomUser 

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
    





#RazorPay

@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        # 1. Capture the absolute RAW body bytes and signature header
        webhook_body = request.body
        received_signature = request.headers.get('X-Razorpay-Signature', '')
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')

        # 2. Use the official SDK Webhook verification helper method
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        try:
            client.utility.verify_webhook_signature(
                webhook_body.decode('utf-8'), 
                received_signature, 
                webhook_secret
            )
            logger.info("🛡️ Webhook cryptographic signature matches perfectly!")
            
        except Exception as sig_err:
            logger.error(f"🚨 Razorpay webhook signature mismatch: {sig_err}")
            return Response({"detail": "Signature integrity verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. If validation passes, read the event data safely
        try:
            event_data = json.loads(webhook_body.decode('utf-8'))
            event_type = event_data.get('event')
            payload = event_data.get('payload', {})
            
            logger.info(f"📦 Intercepted Razorpay Event: {event_type}")

            # 💰 SUCCESS EVENTS
            if event_type in ["order.paid", "payment.captured"]:
                payment_entity = payload.get('payment', {}).get('entity', {})
                razorpay_order_id = payment_entity.get('order_id')
                razorpay_payment_id = payment_entity.get('id')
                razorpay_signature = payment_entity.get('signature', '')
                
                # Update our Payment tracker status to SUCCESS
                Payment.objects.filter(razorpay_order_id=razorpay_order_id).update(
                    status='SUCCESS',
                    razorpay_payment_id=razorpay_payment_id,
                    razorpay_signature=razorpay_signature
                )
                logger.info(f"💰 Confirmed payment capture for Order: {razorpay_order_id}")

            # ❌ FAILURE EVENTS (Bank declines, invalid cards, system dropping out)
            elif event_type == "payment.failed":
                payment_entity = payload.get('payment', {}).get('entity', {})
                razorpay_order_id = payment_entity.get('order_id')
                razorpay_payment_id = payment_entity.get('id')
                
                # Flag the payment instance record as permanently FAILED in our ledger table
                Payment.objects.filter(razorpay_order_id=razorpay_order_id).update(
                    status='FAILED',
                    razorpay_payment_id=razorpay_payment_id
                )
                logger.warning(f"❌ Payment decline captured via Webhook for Order: {razorpay_order_id}")

            return Response({"status": "acknowledged"}, status=status.HTTP_200_OK)

        except Exception as parse_err:
            logger.error(f"❌ Error handling payload parameters: {parse_err}")
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
            # Use the global razorpay_client initialized at the top
            razorpay_order = razorpay_client.order.create(data=order_data)
            return Response({
                "order_id": razorpay_order["id"],
                "amount": amount_in_paisa,
                "currency": currency,
                "razorpay_key_id": settings.RAZORPAY_KEY_ID,
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
        


# Initialize Razorpay Client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class CreateSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            user = request.user
            
            # 🚀 DYNAMIC: Read incoming plan specs from the frontend request
            plan_type = request.data.get('plan_type', 'monthly_premium')
            
            # Map out values based on the front-end tier arguments
            if plan_type == 'starter_pack':
                amount_in_paisa = 99 * 100  
                plan_name = "Starter Pack Subscription"
            else:
                amount_in_paisa = 299 * 100  
                plan_name = "Monthly Premium Pass"

            currency = "INR"

            order_data = {
                "amount": amount_in_paisa,
                "currency": currency,
                "payment_capture": 1,
                "notes": {
                    "user_id": str(user.id),
                    "fullname": user.fullname,
                    "plan_type": plan_type  
                }
            }

            # Generate order context dynamically with correct price point
            razorpay_order = razorpay_client.order.create(data=order_data)

            return Response({
                "order_id": razorpay_order['id'],
                "amount": amount_in_paisa,
                "currency": currency,
                "key_id": settings.RAZORPAY_KEY_ID,
                "user_details": {
                    "fullname": user.fullname,
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
                return Response({"detail": "Cryptographic signature validation check failed."}, status=status.HTTP_400_BAD_REQUEST)

            # --- SUCCESS: STACK PROFILE CREDITS BASED ON THE ORDER DETAILS ---
            user = request.user
            
            rzp_order = razorpay_client.order.fetch(razorpay_order_id)
            plan_type = rzp_order.get('notes', {}).get('plan_type', 'monthly_premium')

            user.is_subscribed = True

            Payment.objects.create(
                user=user,
                plan_type=plan_type.upper(),  # 'STARTER_PACK' or 'MONTHLY_PREMIUM'
                amount=99.00 if plan_type == 'starter_pack' else 299.00,
                status='SUCCESS',
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature
            )
            
            if plan_type == 'starter_pack':
                user.document_credits += 3  # Add 3 uploads for Starter Pack
                plan_display_name = "Starter Pack"
            else:
                user.document_credits += 12  # Add 12 uploads for Premium Pass
                plan_display_name = "Monthly Premium Pass"

            if user.subscription_expires_at and user.subscription_expires_at > timezone.now():
                user.subscription_expires_at = user.subscription_expires_at + timedelta(days=30)
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
        


#Payment Model View
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
                "status": payment.status, # 🔥 Added status tracking string
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