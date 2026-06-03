from django.db import models
from users.models import CustomUser
import os
# Create your models here.


def user_directory_path(instance, filename):
    # 1. Check if the user relation is already assigned to the model instance
    if instance.user and instance.user.id:
        return f'user_{instance.user.id}/documents/{filename}'
    
    # 2. FALLBACK: If DRF triggers this function before assigning the user relation,
    # look inside the file raw upload logs to extract the user context safely.
    if hasattr(instance, '_uploaded_by'):
        return f'user_{instance._uploaded_by.id}/documents/{filename}'

    # 3. Last resort fallback to keep the upload from breaking
    return f'anonymous/documents/{filename}'



class Document(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending Processing'),
        ('PROCESSING', 'OCR Processing Running'),
        ('COMPLETED', 'Success'),
        ('FAILED', 'OCR Process Failed'),
    ]

    user = models.ForeignKey(CustomUser,on_delete=models.CASCADE,related_name='documents')
    document_type = models.CharField(max_length=50,help_text="The classification type of the document (e.g., INVOICE, RECEIPT, PASSPORT).")
    file = models.FileField(upload_to=user_directory_path,help_text="The uploaded physical file (PDF, PNG, JPG, etc.).")
    status = models.CharField(max_length=20, 
                              choices=STATUS_CHOICES, 
                              default='PENDING',
                              help_text="The current processing status of the file.")
    uploaded_at = models.DateTimeField(
        db_index=True, 
        auto_now_add=True,
        help_text="The timestamp when this file hit the server."
    )
    extracted_text = models.TextField(
        blank=True, 
        null=True,
        help_text="The raw text extracted via your Python OCR parser."
    )

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Document Upload"
        verbose_name_plural = "Document Uploads"

    def __str__(self):
        return f"{self.document_type} - {self.user.username} ({self.status})"

    @property
    def filename(self):
        return os.path.basename(self.file.name)