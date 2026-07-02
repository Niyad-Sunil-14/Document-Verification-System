from django.urls import path
from . views import *

urlpatterns = [
    path('upload/',DocumentUploadView.as_view(),name='document-upload'),
    path('list/', DocumentListView.as_view(), name='document-list'),
    path('detail/<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('notifications/',NotificationListView.as_view(),name='notificaitions'),


    #RazorPay
    path('payments/razorpay-webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),
    path('payments/create-order/', RazorpayOrderCreateView.as_view(), name='create-order'),
    path('payments/create-subscription/', CreateSubscriptionView.as_view(), name='create-subscription'),
    path('payments/verify-subscription/', VerifySubscriptionView.as_view(), name='verify-subscription'),


    # ADMIN SIDE
    path('admin-dashboard/', AdminDashboardMetricsView.as_view(), name='admin-dashboard-metrics'),
]