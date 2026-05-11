from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from djangorestframework_camel_case.util import camelize
from django.utils import timezone

from apps.chats.constants import CHAT_USER_INBOX_GROUP_PREFIX
from apps.chats.models import Conversation, ConversationParticipant, Message
from apps.chats.serializers import MessageSerializer
from utils.json import jsonable

logger = logging.getLogger(__name__)


def push_message_created(message: Message) -> None:
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        raw_msg = MessageSerializer(message).data
        msg_payload = camelize({"message": jsonable(raw_msg)})

        # Broadcast to per-user inbox groups
        participants = list(
            ConversationParticipant.objects.filter(
                conversation_id=message.conversation_id
            )
            .select_related("user")
            .only(
                "user_id",
                "last_read_at",
                "user__id",
                "user__username",
                "user__first_name",
                "user__last_name",
                "user__avatar_url",
            )
        )
        if not participants:
            return

        conv = (
            Conversation.objects.filter(id=message.conversation_id)
            .only("id", "type", "title", "direct_key", "last_message_at")
            .first()
        )

        participants_payload = [
            {
                "id": p.user_id,
                "username": getattr(p.user, "username", None),
                "first_name": getattr(p.user, "first_name", None),
                "last_name": getattr(p.user, "last_name", None),
                "avatar_url": getattr(p.user, "avatar_url", None),
            }
            for p in participants
            if getattr(p, "user_id", None) and getattr(p, "user", None)
        ]

        for p in participants:
            last_read_at = p.last_read_at
            unread_qs = Message.objects.filter(
                conversation_id=message.conversation_id
            ).exclude(sender_id=p.user_id)
            if last_read_at:
                unread_qs = unread_qs.filter(created_at__gt=last_read_at)
            unread_count = int(unread_qs.count())

            # Enough fields for UI to render without refetching /conversations.
            conversation_payload = camelize(
                {
                    "conversation": {
                        "id": message.conversation_id,
                        "type": getattr(conv, "type", None),
                        "title": getattr(conv, "title", None) or "",
                        "direct_key": getattr(conv, "direct_key", None),
                        "participants": participants_payload,
                        "last_message_at": (
                            (message.created_at or timezone.now()).isoformat()
                        ),
                        "last_message": jsonable(raw_msg),
                        "unread_count": unread_count,
                    }
                }
            )

            async_to_sync(channel_layer.group_send)(
                f"{CHAT_USER_INBOX_GROUP_PREFIX}.{p.user_id}",
                {
                    "type": "message_created",
                    "payload": {
                        **msg_payload,
                        "conversationId": message.conversation_id,
                        "unreadCount": unread_count,
                    },
                },
            )
            async_to_sync(channel_layer.group_send)(
                f"{CHAT_USER_INBOX_GROUP_PREFIX}.{p.user_id}",
                {"type": "conversation_updated", "payload": conversation_payload},
            )
    except Exception:
        logger.exception(
            "Failed to push message.created realtime event",
            extra={"message_id": getattr(message, "id", None)},
        )


def push_call_signaling(*, sender_id: int, recipient_id: int, data: dict) -> None:
    """
    Relay WebRTC signaling data (offer, answer, ice-candidate) to the recipient.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            f"{CHAT_USER_INBOX_GROUP_PREFIX}.{recipient_id}",
            {
                "type": "call_signaling",
                "payload": {
                    "senderId": sender_id,
                    "data": data,
                },
            },
        )
    except Exception:
        logger.exception(
            "Failed to push call.signaling realtime event",
            extra={"sender_id": sender_id, "recipient_id": recipient_id},
        )
