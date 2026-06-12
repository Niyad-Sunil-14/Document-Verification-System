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
# Create your views here.

class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "user": RegisterSerializer(user).data,
                "message": "User Created Successfully",
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


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

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
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