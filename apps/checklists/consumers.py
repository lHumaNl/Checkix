import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ChecklistConsumer(AsyncJsonWebsocketConsumer):
    """Room-based WebSocket for live collaboration on checklist instances."""

    @database_sync_to_async
    def _user_has_access(self, user, instance_id):
        from apps.checklist_instances.models import ChecklistInstance
        return ChecklistInstance.objects.filter(
            id=instance_id, user=user
        ).exists()

    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return

        self.instance_id = self.scope["url_route"]["kwargs"]["instance_id"]

        if not await self._user_has_access(user, self.instance_id):
            await self.close()
            return

        self.group_name = f"checklist_{self.instance_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Notify others that a user joined
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "user.join",
                "user_id": user.id,
                "username": user.username,
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            user = self.scope.get("user")
            if user and not user.is_anonymous:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "user.leave",
                        "user_id": user.id,
                        "username": user.username,
                    },
                )
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Client doesn't directly send via WS; updates go through REST API
        pass

    async def item_update(self, event):
        """Handle item.update type messages from channel layer."""
        await self.send_json({
            "type": "item_update",
            "data": event["data"],
        })

    async def instance_update(self, event):
        """Handle instance.update type messages from channel layer."""
        await self.send_json({
            "type": "instance_update",
            "data": event["data"],
        })

    async def user_join(self, event):
        """Handle user.join type messages."""
        await self.send_json({
            "type": "user_join",
            "user_id": event["user_id"],
            "username": event["username"],
        })

    async def user_leave(self, event):
        """Handle user.leave type messages."""
        await self.send_json({
            "type": "user_leave",
            "user_id": event["user_id"],
            "username": event["username"],
        })
