from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.folders.views import FolderViewSet

router = DefaultRouter()
router.register(r'', FolderViewSet, basename='folder')

app_name = 'folders'

urlpatterns = [
    path('', include(router.urls)),
]
