from rest_framework import serializers
from . models import Document

class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id','document_type','file']


class DocumentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'