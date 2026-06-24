import logging
import tempfile  # 🔥 Added for secure concurrent processing
import cloudinary # 🔥 Add this import
import environ    # 🔥 Add this import

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
from .models import Document
from .serializers import (
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentUploadSerializer,
)
from .utils import extract_text_from_pdf, preprocess_image_for_ocr

logger = logging.getLogger(__name__)

def pil_to_opencv(pil_image):
    return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

# Initialize env reader locally to ensure direct path lookup
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

                # 🔥 FIX: ROUTE BY FILE EXTENSION
                if is_pdf_file:
                    logger.info(f"Converting PDF {original_filename} pages to image elements...")
                    # Convert only the first page to save memory/processing overhead
                    pages = convert_from_path(temp_filename, first_page=1, last_page=1)
                    
                    if pages:
                        # Convert PIL image element to an OpenCV matrix object
                        opencv_img = pil_to_opencv(pages[0])
                        # Pass the OpenCV image directly or save it to process
                        # Assuming your preprocess function takes a path, we can save it or rewrite your function to accept an image object
                        # If preprocess_image_for_ocr accepts a string path, we write out a temporary image:
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as img_temp:
                            cv2.imwrite(img_temp.name, opencv_img)
                            processed_image = preprocess_image_for_ocr(img_temp.name)
                            
                            # Cleanup the immediate temporary page converter file path
                            try:
                                os.remove(img_temp.name)
                            except:
                                pass
                else:
                    # Regular image processing routing logic
                    processed_image = preprocess_image_for_ocr(temp_filename)

                # 🚀 RUN UNIFIED TESSERACT OCR ENGINE SCAN
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

            # REWIND THE STREAM POINTER FOR CLOUDINARY
            uploaded_file.seek(0)

            # DISPATCH THE ASSET DIRECTLY TO CLOUDINARY
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
                
                # SAVE TO DATABASE SAFEGUARDED BY A TRANSACTION LAYER
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
                        "filename": original_filename,  # Fixed to fall back cleanly
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
        # Staff members see everything, standard users only see their own records
        if request.user.is_staff:
            documents = Document.objects.all()
        else:
            documents = Document.objects.filter(user=request.user)

        serializer = DocumentListSerializer(documents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class DocumentDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentDetailSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Document.objects.all()
        return Document.objects.filter(user=self.request.user)
    






# ADMIN SIDE
from django.db.models import Count, Q
from .models import Document,CustomUser  # Adjust to your exact import path

class AdminDashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # 🛡️ Staff Gatekeeper Check
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {"detail": "Authorization Fault: Lacks elevated clearance."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # 📊 Aggregate database totals completely on the SQL layer
        metrics = Document.objects.aggregate(
            total_documents=Count('id'),
            pending_documents=Count('id', filter=Q(status='PENDING')),
            approved_documents=Count('id', filter=Q(status='APPROVED')),
            rejected_documents=Count('id', filter=Q(status='REJECTED')),
            ocr_processed=Count('id', filter=Q(ocr_status='PROCESSED')),
            ocr_failed=Count('id', filter=Q(ocr_status='FAILED'))
        )

        # Distinct user account aggregation tracking
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