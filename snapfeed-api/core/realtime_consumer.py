from __future__ import annotations

from django.contrib.auth.models import AnonymousUser

from apps.chats.constants import CHAT_USER_INBOX_GROUP_PREFIX
from apps.notifications.constants import NOTIFICATIONS_USER_GROUP_PREFIX
from core.base_consumers import BaseAsyncJsonWebsocketConsumer
import logging

logger = logging.getLogger(__name__)


class RealtimeConsumer(BaseAsyncJsonWebsocketConsumer):
    """
    Single websocket entrypoint for realtime events.
    Joins both chat inbox + notifications groups for the authenticated user.
    """

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
        await self.add_groups(
            f"{CHAT_USER_INBOX_GROUP_PREFIX}.{user.id}",
            f"{NOTIFICATIONS_USER_GROUP_PREFIX}.{user.id}",
        )
        await self.accept()

    # ---- chats
    async def message_created(self, event):
        await self.send_json(
            {"type": "message.created", "payload": event.get("payload")}
        )

    async def conversation_updated(self, event):
        await self.send_json(
            {"type": "conversation.updated", "payload": event.get("payload")}
        )

    # ---- notifications
    async def notification_created(self, event):
        await self.send_json(
            {"type": "notification.created", "payload": event.get("payload")}
        )

    async def notification_read(self, event):
        await self.send_json(
            {"type": "notification.read", "payload": event.get("payload")}
        )

    # ---- video call signaling
    async def call_signaling(self, event):
        payload = event.get("payload")
        logger.info(
            f"[WebRTC] Outgoing signaling to User {self.user.id}. Data: {payload.get('data')}"
        )
        await self.send_json({"type": "call.signaling", "payload": payload})

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        payload = content.get("payload")

        if msg_type == "call.signaling":
            recipient_id = payload.get("recipientId")
            data = payload.get("data")
            logger.info(
                f"[WebRTC] Incoming signaling from User {self.user.id} to {recipient_id}. Data: {data}"
            )

            if recipient_id and data:
                await self.channel_layer.group_send(
                    f"{CHAT_USER_INBOX_GROUP_PREFIX}.{recipient_id}",
                    {
                        "type": "call_signaling",
                        "payload": {
                            "senderId": self.user.id,
                            "data": data,
                        },
                    },
                )
