from rest_framework import serializers
from . models import CustomUser,Support
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from documents.models import Document,Payment

class UserProfileSerializer(serializers.ModelSerializer):
    joined_date = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'fullname', 'profile_picture', 'joined_date', 'is_staff','document_credits','is_subscribed','subscription_expires_at']
        read_only_fields = ['username', 'is_staff']

    def get_joined_date(self, obj):
        if obj.date_joined:
            return obj.date_joined.strftime("%B %d, %Y")
        return "N/A"



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
            raise AuthenticationFailed(detail="Access denied. Only Admin can authenticate.")
        
        data['fullname'] = getattr(self.user, 'fullname', '')
        data['role'] = self.user.role
        return data


# 1. CUSTOM SERIALIZERS (Where role inspection happens)
class StrictUserTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
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
        user = self.context['request'].user
        
        if not user.check_password(value):
            raise serializers.ValidationError("Your current password parameter is incorrect.")
        return value

    def validate(self, data):
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({"new_password": "New password cannot match your current cipher."})
        
        return data
    




#Admin Serilizers
class UserDocumentLogSerializer(serializers.ModelSerializer):
    """Minimal serializer to show nested document history inside user profile views"""
    class Meta:
        model = Document
        fields = ['id', 'filename', 'document_type', 'status', 'ocr_status', 'ocr_accuracy', 'uploaded_at']


class UserPaymentLogSerializer(serializers.ModelSerializer):
    """Minimal serializer to show user checkout transaction history"""
    class Meta:
        model = Payment
        fields = ['id', 'razorpay_order_id', 'amount','plan_type', 'status', 'created_at']


class UserAdminSerializer(serializers.ModelSerializer):
    documents = UserDocumentLogSerializer(many=True, read_only=True)
    payments = UserPaymentLogSerializer(many=True, read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'fullname', 'email', 'document_credits', 'is_subscribed', 'documents','payments']

    def to_representation(self, instance):
        """
        🚀 EMERGENCY BACKUP ROUTE: If your model has a tricky related_name setup,
        this custom loop explicitly catches all records bound to the user id.
        """
        representation = super().to_representation(instance)
        
        if not representation.get('documents'):
            user_docs = Document.objects.filter(user=instance).order_by('-id')
            representation['documents'] = UserDocumentLogSerializer(user_docs, many=True).data

        if not representation.get('payments'):
            user_payments = Payment.objects.filter(user=instance).order_by('-created_at')
            representation['payments'] = UserPaymentLogSerializer(user_payments, many=True).data
            
        return representation
    





class SupportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Support
        fields = ['id', 'subject', 'category', 'message_text', 'is_resolved', 'created_at']
        read_only_fields = ['id', 'is_resolved', 'created_at']