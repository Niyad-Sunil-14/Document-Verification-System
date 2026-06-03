from rest_framework import serializers
from . models import Document

class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['document_type','file']

        