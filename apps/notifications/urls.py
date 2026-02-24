from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.notifications.views import (
    NotificationRuleViewSet,
    NotificationLogViewSet,
    DynamicDueDateRuleViewSet,
    NotificationSequenceViewSet
)

router = DefaultRouter()
router.register(r'rules', NotificationRuleViewSet, basename='notification-rule')
router.register(r'logs', NotificationLogViewSet, basename='notification-log')
router.register(r'due-date-rules', DynamicDueDateRuleViewSet, basename='dynamic-due-date-rule')
router.register(r'sequences', NotificationSequenceViewSet, basename='notification-sequence')

app_name = 'notifications'

urlpatterns = [
    path('', include(router.urls)),
]
