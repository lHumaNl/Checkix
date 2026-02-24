from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.webhooks.views import WebhookViewSet, WebhookEventViewSet

router = DefaultRouter()
router.register(r'', WebhookViewSet, basename='webhook')

events_router = DefaultRouter()
events_router.register(r'', WebhookEventViewSet, basename='webhook-event')

app_name = 'webhooks'

urlpatterns = [
    path('', include(router.urls)),
]

events_urlpatterns = events_router.urls
