from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.calendar.views import CalendarEventViewSet

router = DefaultRouter()
router.register(r'events', CalendarEventViewSet, basename='calendar-event')

app_name = 'calendar'

urlpatterns = [
    path('', include(router.urls)),
]
