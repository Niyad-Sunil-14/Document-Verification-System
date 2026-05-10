from rest_framework import serializers
from . models import CustomUser

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
    

