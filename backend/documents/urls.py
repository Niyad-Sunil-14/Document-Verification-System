from django.urls import path
from . views import DocumentUploadView,DocumentListView,DocumentDetailView,AdminDashboardMetricsView,NotificationListView

urlpatterns = [
    path('upload/',DocumentUploadView.as_view(),name='document-upload'),
    path('list/', DocumentListView.as_view(), name='document-list'),
    path('detail/<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('notifications/',NotificationListView.as_view(),name='notificaitions'),


    # ADMIN SIDE
    path('admin-dashboard/', AdminDashboardMetricsView.as_view(), name='admin-dashboard-metrics'),
]