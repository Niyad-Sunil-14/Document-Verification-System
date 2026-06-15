from django.db import models
from users.models import CustomUser
import os
# Create your models here.


def user_directory_path(instance, filename):
    if instance.user and instance.user.id:
        return f'user_{instance.user.id}/documents/{filename}'
    
    if hasattr(instance, '_uploaded_by'):
        return f'user_{instance._uploaded_by.id}/documents/{filename}'

    return f'anonymous/documents/{filename}'



class Document(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved by Admin'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(CustomUser,on_delete=models.CASCADE,related_name='documents')
    document_type = models.CharField(max_length=50,help_text="The classification type of the document (e.g., INVOICE, RECEIPT, PASSPORT).")
    file = models.URLField(max_length=1000)
    filename = models.CharField(max_length=255, blank=True, default="")
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