from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from PIL import Image
import pytesseract
import logging

from .serializers import DocumentUploadSerializer, DocumentListSerializer
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
            
            # 2. Extract text silently in the background
            try:
                image = Image.open(document.file.path)
                text = pytesseract.image_to_string(image)
                
                # If text is found, append it to the document
                document.extracted_text = text
                document.save()
                
            except Exception as ocr_error:
                # If OCR fails, we log it on the server console for developers to see,
                # but we DO NOT throw a 500 error or disrupt the user's upload flow.
                logger.error(f"Silent OCR text extraction failed: {ocr_error}")
            
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