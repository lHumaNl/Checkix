from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.checklist_instances.views import (
    ChecklistInstanceViewSet,
    ChecklistItemInstanceViewSet,
    CompletionLogViewSet
)

router = DefaultRouter()
router.register(r'', ChecklistInstanceViewSet, basename='checklist-instance')
router.register(r'items', ChecklistItemInstanceViewSet, basename='checklist-item-instance')
router.register(r'logs', CompletionLogViewSet, basename='completion-log')

app_name = 'checklist_instances'

urlpatterns = [
    path('', include(router.urls)),
]
