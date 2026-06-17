from django.shortcuts import render
from rest_framework import generics,status
from rest_framework.response import Response
from . serializers import *
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from . signals import password_reset_requested
from django.core.cache import cache
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
import random
import logging
from django.contrib.auth import authenticate
# Create your views here.

User = get_user_model()
logger = logging.getLogger(__name__)



def generate_and_send_otp(email):
    """Helper utility to generate a 6-digit pin, cache it, and email it."""
    otp = f"{random.randint(100000, 999999)}"
    
    # Cache the OTP for 600 seconds (10 minutes) mapped to the user's email
    cache.set(f"reg_otp_{email}", otp, timeout=600)
    
    # Dispatch dispatch payload via SMTP
    try:
        send_mail(
            subject="Activate Your Account - Verification Code",
            message=f"Your secure registration verification code is: {otp}. It expires in 10 minutes.",
            from_email="noreply@identity.vault",
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"OTP successfully transmitted to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
        return False




class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Fire off the first OTP code automatically upon registration submission
            generate_and_send_otp(user.email)
            
            return Response(
                {"message": "User registered. Verification code dispatched."}, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


class VerifyRegistrationView(APIView):
    """🔥 HITS: auth/verify-registration/ from React"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        input_otp = request.data.get("otp")

        if not email or not input_otp:
            return Response({"error": "Parameters 'email' and 'otp' are mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        # Pull cached token out of the memory cluster
        cached_otp = cache.get(f"reg_otp_{email}")

        if not cached_otp:
            return Response({"error": "Verification code has expired or is invalid."}, status=status.HTTP_400_BAD_REQUEST)

        if cached_otp != str(input_otp):
            return Response({"error": "Invalid verification code. Access denied."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            # 🔥 ACTIVATE THE USER INSTANCE NOW
            user.is_active = True
            user.save()

            # Clear cache cleanly so the same OTP cannot be reused
            cache.delete(f"reg_otp_{email}")

            return Response({"message": "Identity verified successfully. Account active."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "Associated registration index not found."}, status=status.HTTP_404_NOT_FOUND)




class ResendOTPView(APIView):
    """🔥 HITS: auth/resend-otp/ from React"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email field is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not User.objects.filter(email=email, is_active=False).exists():
            return Response({"error": "No unverified account found with this email coordinates."}, status=status.HTTP_404_NOT_FOUND)

        success = generate_and_send_otp(email)
        if success:
            return Response({"message": "A fresh token sequence has been dispatched."}, status=status.HTTP_200_OK)
        return Response({"error": "Failed to transmit email message stream."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


class UserLoginView(TokenObtainPairView):
    """Strictly issues tokens to standard USER accounts only."""
    serializer_class = StrictUserTokenSerializer

class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenObtainSerializer



class RequestOTPView(APIView):
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if CustomUser.objects.filter(email=email).exists():
            password_reset_requested.send(sender=self.__class__, email=email)
            return Response({"message": "OTP has been sent."}, status=status.HTTP_200_OK)
        
        return Response(
            {"error": "No user found with this email address."}, 
            status=status.HTTP_404_NOT_FOUND
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp_received = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']
            
            cached_otp = cache.get(f"otp_{email}")
            
            if not cached_otp:
                return Response({"error": "OTP has expired or was never requested."}, status=status.HTTP_400_BAD_REQUEST)
                
            if cached_otp != otp_received:
                return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = CustomUser.objects.get(email=email)
                user.set_password(new_password)
                user.save()
                
                cache.delete(f"otp_{email}")
                
                return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
            except CustomUser.DoesNotExist:
                return Response({"error": "User no longer exists."}, status=status.HTTP_404_NOT_FOUND)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({"message": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        






class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "email": request.user.email,
            "fullname": getattr(request.user, 'fullname', request.user.get_full_name()),
            
            # 🔥 CRUCIAL: Make sure these two lines are returning data to your React frontend
            "is_staff": request.user.is_staff,
            "is_superuser": request.user.is_superuser
        })
    
    def put(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            return Response(
                {"detail": "Password signature updated successfully across server clusters."}, 
                status=status.HTTP_200_OK
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)