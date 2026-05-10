from django.shortcuts import render
from rest_framework import generics,status
from rest_framework.response import Response
from . serializers import *
# Create your views here.

class RegisterView(generics.CreateAPIView):
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
    


