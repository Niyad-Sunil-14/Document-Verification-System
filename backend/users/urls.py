from django.urls import path
from . views import *
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView,TokenBlacklistView

urlpatterns = [
    
    path('auth/admin-login/', AdminLoginView.as_view(), name='auth_admin_login'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/verify-registration/', VerifyRegistrationView.as_view(), name='verify-registration'),
    path('auth/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),

    path('auth/login/',UserLoginView.as_view(),name='token_obtain_pair'),
    path('token/refresh/',TokenRefreshView.as_view(),name='token_refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),

    path('auth/forgot-password/', RequestOTPView.as_view(), name='request-otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),

    path('users/profile/',UserProfileView.as_view(),name='user-profile'),
    path('users/change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    path('users/request-email-update/', RequestEmailUpdateView.as_view(), name='request-email-update'),
    path('users/confirm-email-update/', ConfirmEmailUpdateView.as_view(), name='confirm-email-update'),

    #Admin url
    path('admin/users/', AdminAllUsersView.as_view(), name='admin-all-users'),
    path('admin/users/<int:id>/', AdminUserDetailsView.as_view(), name='admin-user-details'),

    #Support
    path('support/', SupportCreateView.as_view(), name='create-support-ticket'),
    path('support/chat/', AIChatBotView.as_view(), name='support-ai-chat'),

]
