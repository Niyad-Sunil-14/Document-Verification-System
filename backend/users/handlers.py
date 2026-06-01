import random
from django.dispatch import receiver
from django.core.cache import cache
from django.core.mail import send_mail
from .signals import password_reset_requested

@receiver(password_reset_requested)
def handle_password_reset_otp(sender, email, **kwargs):
    # 1. Generate OTP
    otp = str(random.randint(100000, 999999))
    
    # 2. Store in Cache
    cache.set(f"otp_{email}", otp, timeout=300)
    
    # 3. Send Email
    send_mail(
        subject="Your Password Reset OTP",
        message=f"Your OTP is {otp}",
        from_email="noreply@yourdomain.com",
        recipient_list=[email]
    )