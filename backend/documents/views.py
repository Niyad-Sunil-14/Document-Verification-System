from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from . utils import extract_text_from_pdf
from rest_framework.generics import RetrieveAPIView

from PIL import Image
import pytesseract
import logging

from .serializers import DocumentUploadSerializer, DocumentListSerializer,DocumentDetailSerializer
from .models import Document

logger = logging.getLogger(__name__)

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            # 1. Save document to storage. 'status' automatically sets to 'PENDING'
            document = serializer.save(user=request.user)
            file_path = document.file.path
            text = ""

            # 2. Extract text dynamically in the background based on file type
            try:
                if file_path.lower().endswith('.pdf'):
                    # --- ROUTE A: PDF TEXT EXTRACTION ---
                    logger.info(f"Processing digital PDF extraction for Document ID: {document.id}")
                    text = extract_text_from_pdf(file_path)
                else:
                    # --- ROUTE B: IMAGE OCR SCANNING ---
                    logger.info(f"Processing image Tesseract OCR for Document ID: {document.id}")
                    image = Image.open(file_path)
                    text = pytesseract.image_to_string(image)
                
                # If text is found, append it to the document database entry
                if text:
                    document.extracted_text = text.strip()
                    document.save()
                
            except Exception as processing_error:
                # If extraction fails completely, we log it for debugging
                # but DO NOT disrupt the user's frontend upload flow.
                logger.error(f"Silent text extraction/OCR failed for Document {document.id}: {processing_error}")
            
            # 3. Return the full document payload back to React
            return Response(
                DocumentListSerializer(document).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # 1. Isolate Data: Admin sees all records, regular user sees only their own
        if request.user.is_staff:
            documents = Document.objects.all()
        else:
            documents = Document.objects.filter(user=request.user)
        
        # 2. Serialize: Pass the request context so our custom __init__ method 
        # can automatically hide 'extracted_text' from regular users!
        serializer = DocumentListSerializer(documents, many=True, context={'request': request})
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class DocumentDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentDetailSerializer

    def get_queryset(self):
        # Admins can see ALL documents, normal users can only look up their own files!
        if self.request.user.is_staff:
            return Document.objects.all()
        return Document.objects.filter(user=self.request.user)