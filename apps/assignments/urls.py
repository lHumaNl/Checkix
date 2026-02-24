from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.assignments.views import AssignmentViewSet

router = DefaultRouter()
router.register(r'', AssignmentViewSet, basename='assignment')

app_name = 'assignments'

urlpatterns = [
    path('', include(router.urls)),
]
