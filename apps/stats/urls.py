from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.stats.views import ChecklistUsageStatsViewSet

router = DefaultRouter()
router.register(r'', ChecklistUsageStatsViewSet, basename='usage-stats')

app_name = 'stats'

urlpatterns = [
    path('', include(router.urls)),
]
