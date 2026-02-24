from django.urls import re_path

from apps.notifications.consumers import NotificationConsumer
from apps.checklists.consumers import ChecklistConsumer

websocket_urlpatterns = [
    re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
    re_path(r"ws/checklists/(?P<instance_id>\d+)/$", ChecklistConsumer.as_asgi()),
]
