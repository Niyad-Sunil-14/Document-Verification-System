from django.urls import path
from . views import *
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView

urlpatterns = [
    
    path('auth/admin-login/', AdminLoginView.as_view(), name='auth_admin_login'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    path('auth/login/',TokenObtainPairView.as_view(),name='token_obtain_pair'),
    path('token/refresh/',TokenRefreshView.as_view(),name='token_refresh'),

    path('auth/forgot-password/', RequestOTPView.as_view(), name='request-otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]
