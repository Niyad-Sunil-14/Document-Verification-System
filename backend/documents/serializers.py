from rest_framework import serializers
from .models import Document

class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    username = serializers.ReadOnlyField(source='user.fullname')

    class Meta:
        model = Document
        fields = ['id', 'username', 'document_type', 'file', 'status', 'ocr_status', 'uploaded_at']


class DocumentListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file = serializers.CharField(read_only=True) 
    # 🔥 ADDED: Pulls the username string directly for your React columns table matching
    username = serializers.ReadOnlyField(source='user.fullname')
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 
            'username',  # 👈 Added to the fields mapping manifest array
            'document_type', 
            'file', 
            'filename',
            'status', 
            'ocr_status',
            'status_display', 
            'uploaded_at',
        ]

    def get_uploaded_at(self, obj):
        date_field = getattr(obj, 'date_joined', getattr(obj, 'uploaded_at', getattr(obj, 'created_at', None)))
        if date_field:
            return date_field.strftime("%B %d, %Y")
        return "Recent"


class DocumentDetailSerializer(serializers.ModelSerializer):
    # 🔥 ADDED: Optional safeguard case if you need the username on your detailed audit pages later
    username = serializers.ReadOnlyField(source='user.fullname')
    file = serializers.CharField(read_only=True)
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'username', 'file', 'filename', 'document_type', 'status', 'extracted_text', 'uploaded_at']

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