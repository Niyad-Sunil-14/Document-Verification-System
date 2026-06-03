from django.shortcuts import render
from rest_framework import generics,status
from . serializers import DocumentUploadSerializer
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser  
from rest_framework.response import Response

# Create your views here.


class DocumentUploadView(APIView):
    permission_classes = [AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = DocumentUploadSerializer(data=request.data)
        
        # 1. Check validation
        if serializer.is_valid():
            document = serializer.save(user=request.user, status='PROCESSING')
            
            try:
                # ... your OCR logic (Image.open, pytesseract, etc.) ...
                
                document.status = 'COMPLETED'
                document.save()
                
                # SUCCESS RETURN
                return Response(DocumentUploadSerializer(document).data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                document.status = 'FAILED'
                document.save()
                # EXCEPTION RETURN
                return Response(
                    {"error": f"OCR processing failed: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # ❌ YOU ARE LIKELY MISSING THIS LINE BELOW:
        # 2. If serializer.is_valid() evaluates to False, execution drops down here.
        # Without this return statement, Django returns None and crashes!
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)