from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


def _user_group_name(user_id: int) -> str:
    return f"notifications.user.{user_id}"


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if (
            not user
            or isinstance(user, AnonymousUser)
            or not getattr(user, "is_authenticated", False)
        ):
            await self.close(code=4401)
            return

        self.user = user
        self.group_name = _user_group_name(user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_created(self, event):
        # event: { "type": "notification.created", "payload": {...} }
        await self.send_json(
            {"type": "notification.created", "payload": event.get("payload")}
        )

    async def notification_read(self, event):
        await self.send_json(
            {"type": "notification.read", "payload": event.get("payload")}
        )
