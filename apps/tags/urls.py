from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.utils import extend_schema

from apps.tags.views import TagViewSet

router = DefaultRouter()
router.register(r'', TagViewSet, basename='tag')

app_name = 'tags'

urlpatterns = [
    path('', include(router.urls)),
]
