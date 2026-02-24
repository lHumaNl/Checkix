import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_instance_update(instance, action, user):
    """Broadcast instance status change to the checklist room."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group_name = f"checklist_{instance.id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "instance.update",
                "data": {
                    "instance_id": instance.id,
                    "status": instance.status,
                    "action": action,
                    "progress_percentage": instance.progress_percentage,
                    "user_id": user.id,
                    "username": user.username,
                },
            },
        )
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed: {e}")


def broadcast_item_toggle(item_instance, action, user):
    """Broadcast item toggle to the checklist room."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group_name = f"checklist_{item_instance.instance_id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "item.update",
                "data": {
                    "instance_id": item_instance.instance_id,
                    "item_id": item_instance.id,
                    "is_completed": item_instance.is_completed,
                    "action": action,
                    "user_id": user.id,
                    "username": user.username,
                },
            },
        )
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed: {e}")


def broadcast_notification(user_id, notification_data):
    """Broadcast a notification to a user's WebSocket group."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group_name = f"user_{user_id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification.send",
                "data": notification_data,
            },
        )
    except Exception as e:
        logger.warning(f"WebSocket notification broadcast failed: {e}")
