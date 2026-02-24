from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.run_links.views import RunLinkViewSet

router = DefaultRouter()
router.register(r'', RunLinkViewSet, basename='run-link')

app_name = 'run_links'

urlpatterns = [
    path('', include(router.urls)),
]
