from rest_framework import serializers
from . models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed

class UserSerializer(serializers.ModelSerializer):
    date_joined = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    class Meta:
        model = CustomUser
        fields = ['id','email','fullname','role','date_joined']



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
            is_active=False
        )
        return user
    

class AdminTokenObtainSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role  
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        if self.user.role != 'ADMIN':
            raise AuthenticationFailed(detail="Access denied. Admin privileges required.")
        
        data['fullname'] = getattr(self.user, 'fullname', '')
        data['role'] = self.user.role
        return data


# 1. CUSTOM SERIALIZERS (Where role inspection happens)
class StrictUserTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Let SimpleJWT authenticate the credentials first
        data = super().validate(attrs)
        
        # 🔥 CLIENT GATEKEEPER: If user is staff or superuser, block them from this endpoint!
        if self.user.is_staff or self.user.is_superuser:
            raise AuthenticationFailed(
                "Access Denied: Administrators are restricted from logging into the Client Portal.",
                code="access_denied"
            )
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



class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        # Grab the logged-in user instance passed from the view context
        user = self.context['request'].user
        
        # Verify if the input matches their active password hash
        if not user.check_password(value):
            raise serializers.ValidationError("Your current password parameter is incorrect.")
        return value

    def validate(self, data):
        # Prevent the user from re-submitting their old password as the new password
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({"new_password": "New password cannot match your current cipher."})
        
        return data
    

