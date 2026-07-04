from django.shortcuts import render
from rest_framework import generics,status
from rest_framework.response import Response
from . serializers import *
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny,IsAuthenticated,IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from . signals import password_reset_requested
from django.core.cache import cache
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
import random
import logging
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
import cloudinary.uploader
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
    # 🔥 FIX 1: Ensure view handles both multipart image payloads and raw JSON updates
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        
        # 🔥 FIX 2: Check for incoming avatar file upgrades explicitly
        if 'profile_picture' in request.FILES:
            try:
                uploaded_file = request.FILES['profile_picture']
                
                # Push the binary image stream directly to Cloudinary
                upload_result = cloudinary.uploader.upload(
                    uploaded_file,
                    folder="user_profiles/",
                    resource_type="image"
                )
                
                # Save the secure URL string inside the user instance field
                user.profile_picture = upload_result.get("secure_url")
                user.save()
                
                # Return the updated instance via your serializer immediately
                serializer = UserProfileSerializer(user)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
            except Exception as upload_err:
                return Response(
                    {"detail": f"Avatar upload matrix failed: {str(upload_err)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Fallback processing loop for normal text profile changes (like changing fullnames)
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # If you are targeting PUT requests from React form submissions, mirror the logic:
    def put(self, request):
        return self.patch(request)
    


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
    





class RequestEmailUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # 1. Extract and sanitize incoming email payload strings
        raw_email = request.data.get('email', '')
        if not raw_email:
            return Response({"detail": "New email parameter required."}, status=status.HTTP_400_BAD_REQUEST)
            
        new_email = raw_email.strip().lower()

        # 2. DEFENSIVE CHECK: Prevent users from resetting to their current email
        if new_email == request.user.email.lower():
            return Response(
                {"detail": "This is already your registered email address."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. UNIQUENESS CHECK: Ensure the email does not exist anywhere else in the DB
        if User.objects.filter(email__iexact=new_email).exists():
            return Response(
                {"detail": "This email address is already in use by another account."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 4. GENERATION: Compile the 6-digit confirmation string token
        verification_code = f"{random.randint(100000, 999999)}"
        
        # 5. CACHE BUFFER: Store email + token mapping tied to user ID session context for 10 min
        cache.set(
            f"email_otp_{request.user.id}", 
            {"email": new_email, "code": verification_code}, 
            timeout=600
        )
        
        # 6. DISPATCH: Fire transactional security email directly to target address
        send_mail(
            subject="DocVerify Security Center: Confirm Your New Email Address",
            message=f"Your confirmation token is: {verification_code}. It will expire in 10 minutes.",
            from_email="security@docverify.com",
            recipient_list=[new_email],
            fail_silently=False,
        )
        
        return Response(
            {"detail": "Verification security token dispatched successfully."}, 
            status=status.HTTP_200_OK
        )

class ConfirmEmailUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code_submitted = request.data.get('code')
        cached_data = cache.get(f"email_otp_{request.user.id}")
        
        if not cached_data or cached_data["code"] != code_submitted:
            return Response({"detail": "Invalid or expired authorization code parameters."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Code matches, update user instances safely
        user = request.user
        user.email = cached_data["email"]
        user.save()
        
        # Evict cache tokens
        cache.delete(f"email_otp_{user.id}")
        return Response({"detail": "Email records modified securely.", "email": user.email}, status=status.HTTP_200_OK)
    




#Admin Views
class AdminAllUsersView(APIView):
    # Enforces that only system admins/staff can access this directory route
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        try:
            # Fetch all users, ordering by newest or by name
            users = User.objects.all().order_by('-id')
            serializer = UserAdminSerializer(users, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Failed fetching system user directory: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserDetailsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, id, *args, **kwargs):
        try:
            # 🚀 OPTIMIZATION: Prefetch the bound documents instantly in one query execution pass
            user_profile = User.objects.filter(id=id).prefetch_related('documents').first()

            if not user_profile:
                return Response({"detail": "User profile index not found."}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = UserAdminSerializer(user_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Error parsing user profile metrics: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)