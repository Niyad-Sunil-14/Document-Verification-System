from django.db import models
import os
from users.models import CustomUser
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
        ('APPROVED', 'Approved by DocVerify'),
        ('REJECTED', 'Rejected'),
    ]

    OCR_STATUS_CHOICES = [
        ('PROCESSED', 'OCR Processed'),
        ('FAILED', 'OCR Failed'),
    ]

    user = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    document_type = models.CharField(
        max_length=50, 
        help_text="The classification type of the document (e.g., INVOICE, RECEIPT, PASSPORT)."
    )
    file = models.URLField(max_length=1000)
    
    filename = models.CharField(max_length=255, blank=True, default="")
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='PENDING',
        help_text="The current processing status of the file."
    )

    ocr_status = models.CharField(
        max_length=20,
        choices=OCR_STATUS_CHOICES,
        default='PENDING',
        help_text="Tracks whether text extraction via Python OCR engine succeeded or threw errors."
    )

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

    remarks = models.TextField(blank=True, default="")

    ocr_accuracy = models.FloatField(
        default=0.0,
        help_text="The calculated mean confidence level percentage of the parsed text."
    )

    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    payment_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Document Upload"
        verbose_name_plural = "Document Uploads"

    def __str__(self):
        return f"{self.document_type} - {self.user.email} ({self.status} | OCR: {self.ocr_status})"


    @property
    def computed_filename(self):
        if self.filename:
            return self.filename
        if self.file:
            return os.path.basename(self.file)
        return "Unknown_Asset.file"
    




class Notification(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    document = models.ForeignKey(
        Document, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='notifications'
    )

    class Meta:
        ordering = ['-created_at']



class Payment(models.Model):
    PLAN_CHOICES = [
        ('PAY_AS_YOU_VERIFY', 'Pay-As-You-Verify (₹49)'),
        ('STARTER_PACK', 'Starter Pack (₹99)'),
        ('MONTHLY_PREMIUM', 'Monthly Premium Pass (₹299)'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    
    # Financial Structure details
    plan_type = models.CharField(max_length=50, choices=PLAN_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2) 
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Razorpay Transaction Identifiers
    razorpay_order_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=555, blank=True, null=True)
    
    # 🔗 One-to-One connection mapping back to your uploaded document model
    document = models.OneToOneField(
        Document, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='payment_record'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Payment Transaction"
        verbose_name_plural = "Payment Transactions"

    def __str__(self):
        return f"{self.user.email} - {self.plan_type} ({self.amount}) - {self.status}"