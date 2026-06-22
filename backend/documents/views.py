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

import os
from .models import Document
from .serializers import (
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentUploadSerializer,
)
from .utils import extract_text_from_pdf, preprocess_image_for_ocr

logger = logging.getLogger(__name__)


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
            
            # 🔥 Establish default state variable for the new field
            ocr_pipeline_status = "PENDING"
            
            # 1. CLEAN TEXT EXTRACTION ROUTING MATRIX
            try:
                uploaded_file.seek(0)
                
                if is_pdf_file:
                    logger.info(f"Extracting native text from PDF: {original_filename}")
                    text = extract_text_from_pdf(uploaded_file)
                else:
                    logger.info(f"Running OpenCV & Tesseract OCR pipeline on image: {original_filename}")
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(original_filename)[1]) as temp_file:
                        for chunk in uploaded_file.chunks():
                            temp_file.write(chunk)
                        temp_filename = temp_file.name

                    try:
                        processed_image = preprocess_image_for_ocr(temp_filename)
                        if processed_image:
                            text = pytesseract.image_to_string(processed_image)
                    finally:
                        if os.path.exists(temp_filename):
                            os.remove(temp_filename)
                
                # 🔥 EVALUATE PIPELINE HEALTH: Set status based on character discovery
                if text and text.strip():
                    ocr_pipeline_status = "PROCESSED"
                else:
                    ocr_pipeline_status = "FAILED"
                            
            except Exception as ocr_err:
                logger.error(f"Text extraction engine failed: {ocr_err}")
                # 🔥 FALLBACK ON CRASH: Mark explicitly as a pipeline failure
                ocr_pipeline_status = "FAILED"
                
            # 2. REWIND THE STREAM POINTER FOR CLOUDINARY
            uploaded_file.seek(0)

            # 3. DISPATCH THE ASSET DIRECTLY TO CLOUDINARY
            try:
                cloudinary.config(
                    cloud_name=env('CLOUDINARY_CLOUD_NAME'),
                    api_key=env('CLOUDINARY_API_KEY'),
                    api_secret=env('CLOUDINARY_API_SECRET'),
                    secure=True
                )
                
                determined_resource_type = "raw" if is_pdf_file else "image"
                
                logger.info(f"Uploading file {original_filename} to Cloudinary as {determined_resource_type}...")
                
                upload_result = cloudinary.uploader.upload(
                    uploaded_file,
                    folder="user_documents/",
                    resource_type=determined_resource_type
                )
                
                secure_url = upload_result.get("secure_url")
                
                # 4. SAVE TO DATABASE SAFEGUARDED BY A TRANSACTION LAYER
                with transaction.atomic():
                    document = Document.objects.create(
                        user=request.user,
                        document_type=document_type,
                        file=secure_url,
                        filename=original_filename,
                        status="PENDING", # 👈 Remains under review as requested
                        ocr_status=ocr_pipeline_status, # 🔥 SAVED SEPARATELY HERE
                        extracted_text=text.strip() if text else ""
                    )

                return Response(
                    {
                        "id": document.id, 
                        "document_type": document.document_type,
                        "file": document.file, 
                        "filename": document.filename,
                        "extracted_text": document.extracted_text, 
                        "status": document.status,
                        "ocr_status": document.ocr_status # Expose tracking to your frontend responses
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