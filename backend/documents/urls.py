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

    path('users/subscription-details/', SubscriptionDetailsView.as_view(), name='sub-details-panel'),
    path('users/subscription-cancel/', CancelSubscriptionView.as_view(), name='sub-cancel-intent'),
    path('users/subscription-renew-intent/', CreateSubscriptionView.as_view(), name='sub-renew-order'),
    

    path('payments/history/',PaymentHistoryListView.as_view(),name='payment-history'),
    path('payments/log-failure/', LogPaymentFailureView.as_view(), name='log-payment-failure'),
    path('payments/<int:id>/', PaymentDetailRetrieveView.as_view(), name='payment-detail-lookup'),

    # ADMIN SIDE
    path('admin-dashboard/', AdminDashboardMetricsView.as_view(), name='admin-dashboard-metrics'),
]