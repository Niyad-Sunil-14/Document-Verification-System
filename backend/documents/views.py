import logging
import tempfile  
import cloudinary 
import environ    

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
import cloudinary.uploader
import pytesseract
from pytesseract import Output
from pdf2image import convert_from_path 
import cv2
import numpy as np

import os
from .models import Document,Notification
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

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        
        if serializer.is_valid():
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
                        extracted_text=text.strip() if text else ""
                    )

                return Response(
                    {
                        "id": document.id, 
                        "document_type": document.document_type,
                        "file": document.file, 
                        "filename": original_filename,
                        "extracted_text": document.extracted_text, 
                        "status": document.status,
                        "ocr_status": document.ocr_status,
                        "ocr_accuracy": document.ocr_accuracy
                    },
                    status=status.HTTP_201_CREATED
                )
                
            except Exception as upload_error:
                logger.error(f"Cloudinary upload failed: {upload_error}")
                return Response(
                    {"error": f"Cloudinary upload failed: {str(upload_error)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.is_staff:
            documents = Document.objects.all()
        else:
            documents = Document.objects.filter(user=request.user)

        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    


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
            if serializer.is_valid():
                serializer.save()
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
    




