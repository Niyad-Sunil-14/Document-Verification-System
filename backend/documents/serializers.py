from rest_framework import serializers
from .models import Document

class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = Document
        fields = ['id', 'document_type', 'file', 'status']


class DocumentListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file = serializers.CharField(read_only=True) 
    
    # 🔥 FIXED: Changed to a SerializerMethodField to match the bulletproof logic 
    # of your detail serializer. This prevents field-dropping if the model column name changes.
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 
            'document_type', 
            'file', 
            'filename',
            'status', 
            'status_display', 
            'uploaded_at',
        ]

    def get_uploaded_at(self, obj):
        # Inspects your model dynamically for any common timestamp name variant
        date_field = getattr(obj, 'date_joined', getattr(obj, 'uploaded_at', getattr(obj, 'created_at', None)))
        if date_field:
            return date_field.strftime("%B %d, %Y")
        return "Recent"


class DocumentDetailSerializer(serializers.ModelSerializer):
    file = serializers.CharField(read_only=True)
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'file','filename', 'document_type', 'status', 'extracted_text', 'uploaded_at']

    def get_uploaded_at(self, obj):
        date_field = getattr(obj, 'date_joined', getattr(obj, 'uploaded_at', getattr(obj, 'created_at', None)))
        if date_field:
            return date_field.strftime("%B %d, %Y at %I:%M %p")
        return "Recent"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and request.user and not request.user.is_staff:
            data.pop('extracted_text', None)
        return data