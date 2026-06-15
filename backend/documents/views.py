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
            
            # 🔥 CRUCIAL: Grab this early while the stream wrapper is completely fresh
            is_pdf_file = uploaded_file.name.lower().endswith('.pdf')
            text = ""
            
            # 1. CLEAN TEXT EXTRACTION ROUTING MATRIX
            try:
                # 🔥 FIX 1: Rewind the stream pointer to the absolute start BEFORE OCR begins
                uploaded_file.seek(0)
                
                if is_pdf_file:
                    logger.info(f"Extracting native text from PDF: {uploaded_file.name}")
                    text = extract_text_from_pdf(uploaded_file)
                else:
                    logger.info(f"Running OpenCV & Tesseract OCR pipeline on image: {uploaded_file.name}")
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_file.name)[1]) as temp_file:
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
                            
            except Exception as ocr_err:
                logger.error(f"Text extraction engine failed: {ocr_err}")
                
            # 2. REWIND THE STREAM POINTER FOR CLOUDINARY
            # 🔥 FIX 2: Rewind it AGAIN so Cloudinary reads a full file from byte 0!
            uploaded_file.seek(0)

            # 3. DISPATCH THE ASSET DIRECTLY TO CLOUDINARY WITH STRICT EXPLICIT TYPING
            try:
                cloudinary.config(
                    cloud_name=env('CLOUDINARY_CLOUD_NAME'),
                    api_key=env('CLOUDINARY_API_KEY'),
                    api_secret=env('CLOUDINARY_API_SECRET'),
                    secure=True
                )
                
                determined_resource_type = "raw" if is_pdf_file else "image"
                
                logger.info(f"Uploading file {uploaded_file.name} to Cloudinary as {determined_resource_type}...")
                
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
                        extracted_text=text.strip() if text else "",
                        status="PENDING"
                    )

                return Response(
                    {
                        "id": document.id, 
                        "document_type": document.document_type,
                        "file": document.file, 
                        "extracted_text": document.extracted_text, 
                        "status": document.status
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