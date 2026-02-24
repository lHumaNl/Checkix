from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.community.views import CommunityTemplateViewSet, TemplateRatingViewSet

router = DefaultRouter()
router.register(r'templates', CommunityTemplateViewSet, basename='community-template')
router.register(r'ratings', TemplateRatingViewSet, basename='template-rating')

app_name = 'community'

urlpatterns = [
    path('', include(router.urls)),
]
