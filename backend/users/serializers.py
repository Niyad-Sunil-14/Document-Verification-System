from rest_framework import serializers
from . models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id','email','fullname','role']



class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['fullname','email','password']
        
    def create(self, validated_data):

        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            fullname=validated_data['fullname'],
            password=validated_data['password'],
        )
        return user
    

class AdminTokenObtainSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # 1. Encrypt the role INSIDE the token payload (tamper-proof)
        token['role'] = user.role  
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # 2. Absolute gatekeeper check
        if self.user.role != 'ADMIN':
            raise AuthenticationFailed(detail="Access denied. Admin privileges required.")
        
        # 3. Add public helper data to the raw response body
        data['fullname'] = getattr(self.user, 'fullname', '')
        data['role'] = self.user.role
        return data




class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)