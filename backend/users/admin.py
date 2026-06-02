from django.contrib import admin
from . models import CustomUser,BaseUserManager
# Register your models here.

admin.site.register(CustomUser)
