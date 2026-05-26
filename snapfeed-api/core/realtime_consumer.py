from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

from apps.chats.constants import CHAT_USER_INBOX_GROUP_PREFIX
from apps.notifications.constants import NOTIFICATIONS_USER_GROUP_PREFIX
from apps.permissions.constants import Groups
from core.base_consumers import BaseAsyncJsonWebsocketConsumer
import logging

logger = logging.getLogger(__name__)


@database_sync_to_async
def is_user_moderator(user):
    if user.is_superuser:
        return True
    return user.groups.filter(
        name__in=[Groups.ADMIN.value, Groups.MODERATOR.value]
    ).exists()


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
        groups = [
            f"{CHAT_USER_INBOX_GROUP_PREFIX}.{user.id}",
            f"{NOTIFICATIONS_USER_GROUP_PREFIX}.{user.id}",
        ]

        # Join support moderators group if they are moderator
        is_mod = await is_user_moderator(user)
        if is_mod:
            groups.append("support_moderators")

        await self.add_groups(*groups)
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

    # ---- support tickets
    async def support_reply_created(self, event):
        await self.send_json(
            {"type": "support.reply_created", "payload": event.get("payload")}
        )

    async def support_ticket_updated(self, event):
        await self.send_json(
            {"type": "support.ticket_updated", "payload": event.get("payload")}
        )

    async def support_ticket_created(self, event):
        await self.send_json(
            {"type": "support.ticket_created", "payload": event.get("payload")}
        )

    # ---- video reports
    async def video_report_created(self, event):
        await self.send_json(
            {"type": "video_report.created", "payload": event.get("payload")}
        )

    async def video_report_updated(self, event):
        await self.send_json(
            {"type": "video_report.updated", "payload": event.get("payload")}
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
