from rest_framework import serializers
from . models import Document

class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id','document_type','file']


class DocumentListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    uploaded_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M")

    class Meta:
        model = Document
        fields = [
            'id', 
            'document_type', 
            'file', 
            'filename',
            'status', 
            'status_display', 
            'uploaded_at'
        ]


class DocumentDetailSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'filename', 'file', 'document_type', 'status', 'extracted_text', 'uploaded_at']

    def get_uploaded_at(self, obj):
        return obj.uploaded_at.strftime("%B %d, %Y at %I:%M %p")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and request.user and not request.user.is_staff:
            data.pop('extracted_text', None)
        return data