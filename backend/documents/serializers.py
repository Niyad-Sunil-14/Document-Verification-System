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


class DocumentDetailSerializer(serializers.ModelSerializer):
    # Converts absolute server file paths into full download URLs for React's iframe/img tags
    file = serializers.FileField(use_url=True)
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ['id', 'filename', 'file', 'document_type', 'status', 'extracted_text', 'uploaded_at']

    def get_uploaded_at(self, obj):
        # Format the timestamp nicely for the frontend metadata bar
        return obj.uploaded_at.strftime("%B %d, %Y at %I:%M %p")

    # 🔥 THE SECURE ADMIN FILTER SWITCH
    def to_representation(self, instance):
        # 1. Gather the standard initial dictionary payload data output
        data = super().to_representation(instance)
        
        # 2. Extract the incoming request context from the view layer
        request = self.context.get('request')
        
        # 3. Guard Condition: If the user is NOT a member of the admin/staff team...
        if request and request.user and not request.user.is_staff:
            # Completely pop 'extracted_text' out of the final JSON sent to React
            data.pop('extracted_text', None)
            
        return data