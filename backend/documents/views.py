from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from . utils import extract_text_from_pdf,preprocess_image_for_ocr
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
            document = serializer.save(user=request.user)
            file_path = document.file.path
            text = ""

            try:
                if file_path.lower().endswith('.pdf'):
                    logger.info(f"Processing digital PDF extraction for Document ID: {document.id}")
                    text = extract_text_from_pdf(file_path)
                else:
                    logger.info(f"Processing image preprocessing & Tesseract OCR for Document ID: {document.id}")
                    processed_image = preprocess_image_for_ocr(file_path)
                    
                    if processed_image is not None:
                        text = pytesseract.image_to_string(processed_image)
                    else:
                        logger.warning(f"CV2 preprocessing returned None for doc {document.id}. Falling back to raw image.")
                        image = Image.open(file_path)
                        text = pytesseract.image_to_string(image)
                
                if text:
                    document.extracted_text = text.strip()
                    document.save()
                
            except Exception as processing_error:
                logger.error(f"Silent text extraction/OCR failed for Document {document.id}: {processing_error}")
            
            return Response(
                DocumentListSerializer(document).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.is_staff:
            documents = Document.objects.all()
        else:
            documents = Document.objects.filter(user=request.user)

        serializer = DocumentListSerializer(documents, many=True, context={'request': request})
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class DocumentDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentDetailSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Document.objects.all()
        return Document.objects.filter(user=self.request.user)