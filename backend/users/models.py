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

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["fullname"]

    objects = CustomUserManager()

    def __str__(self):
        return self.email
    


