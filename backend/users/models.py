from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.utils.translation import gettext_lazy as _

# Create your models here.

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError(_("The Email must be set"))
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
            
        return self.create_user(email, password, **extra_fields)




class CustomUser(AbstractUser):

    class Role(models.TextChoices):
        USER = "USER", _("User")
        ADMIN = "ADMIN", _("Admin")

    username = None
    email = models.EmailField(_("email address"), unique=True)
    role = models.CharField(max_length=10,choices=Role,default=Role.USER)
    fullname = models.CharField(max_length=100)
    profile_picture = models.URLField(blank=True, null=True, default="")

    #Subscription fields
    is_subscribed = models.BooleanField(default=False)
    document_credits = models.IntegerField(default=0)  
    subscription_expires_at = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["fullname"]

    objects = CustomUserManager()

    def __str__(self):
        return self.email
    




class Support(models.Model):
    CATEGORY_CHOICES = [
        ('TECHNICAL', 'Technical Glitch'),
        ('BILLING', 'Payment & Billings'),
        ('ACCOUNT', 'Account Access Profile'),
        ('OTHER', 'Miscellaneous Concerns'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='TECHNICAL')
    message_text = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - {self.subject} ({self.user.email})"