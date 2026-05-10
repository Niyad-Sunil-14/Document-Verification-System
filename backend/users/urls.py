from django.urls import path
from . views import *
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView

urlpatterns = [
    
    
    path('auth/register/', RegisterView.as_view(), name='auth_register'),

    path('auth/login/',TokenObtainPairView.as_view(),name='token_obtain_pair'),
    path('token/refresh/',TokenRefreshView.as_view(),name='token_refresh'),
]
