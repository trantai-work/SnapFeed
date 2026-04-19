from __future__ import annotations

from django.contrib.auth.models import AnonymousUser

from apps.chats.constants import CHAT_USER_INBOX_GROUP_PREFIX
from core.consumers import BaseAsyncJsonWebsocketConsumer


class ChatsInboxConsumer(BaseAsyncJsonWebsocketConsumer):
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
        await self.add_groups(f"{CHAT_USER_INBOX_GROUP_PREFIX}.{user.id}")
        await self.accept()

    async def message_created(self, event):
        await self.send_json(
            {"type": "message.created", "payload": event.get("payload")}
        )

    async def conversation_updated(self, event):
        await self.send_json(
            {"type": "conversation.updated", "payload": event.get("payload")}
        )
