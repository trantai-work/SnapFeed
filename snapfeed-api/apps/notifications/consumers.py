from __future__ import annotations

from django.contrib.auth.models import AnonymousUser

from apps.notifications.constants import NOTIFICATIONS_USER_GROUP_PREFIX
from core.base_consumers import BaseAsyncJsonWebsocketConsumer


class NotificationsConsumer(BaseAsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if (
            not user
            or isinstance(user, AnonymousUser)
            or not getattr(user, "is_authenticated", False)
        ):
            # During handshake we cannot send websocket frames; close with code only.
            await self.close(code=4401)
            return

        self.user = user
        await self.add_groups(f"{NOTIFICATIONS_USER_GROUP_PREFIX}.{user.id}")
        await self.accept()

    async def notification_created(self, event):
        await self.send_json(
            {"type": "notification.created", "payload": event.get("payload")}
        )

    async def notification_read(self, event):
        await self.send_json(
            {"type": "notification.read", "payload": event.get("payload")}
        )
