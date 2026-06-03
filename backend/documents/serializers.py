from rest_framework import serializers
from . models import Document

class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id','document_type','file']


class DocumentListSerializer(serializers.ModelSerializer):
    # 1. IMPROVEMENT: Convert choices ('PENDING') to beautiful text ('Pending Review')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # 2. IMPROVEMENT: Format the date cleanly so React doesn't have to parse it
    uploaded_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M")

    class Meta:
        model = Document
        # 3. Explicitly select fields, leaving out 'extracted_text' for performance
        fields = [
            'id', 
            'document_type', 
            'file', 
            'filename', # Your custom @property string works here too!
            'status', 
            'status_display', 
            'uploaded_at'
        ]