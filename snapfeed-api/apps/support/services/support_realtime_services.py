from __future__ import annotations
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from djangorestframework_camel_case.util import camelize
from apps.chats.constants import CHAT_USER_INBOX_GROUP_PREFIX
from apps.support.models import SupportTicket, SupportTicketReply
from apps.support.serializers import (
    SupportTicketReplySerializer,
    SupportTicketSerializer,
)
from utils.json import jsonable

logger = logging.getLogger(__name__)


def push_support_reply_created(reply: SupportTicketReply) -> None:
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning(
                "Channel layer is not configured or offline. Skipping support.reply_created push."
            )
            return

        raw_reply = SupportTicketReplySerializer(reply).data
        reply_payload = camelize({"reply": jsonable(raw_reply)})

        # Prepare message payload
        event_data = {
            "type": "support_reply_created",
            "payload": {
                **reply_payload,
                "ticketId": reply.ticket_id,
            },
        }

        # Send to ticket user inbox group
        async_to_sync(channel_layer.group_send)(
            f"{CHAT_USER_INBOX_GROUP_PREFIX}.{reply.ticket.user_id}", event_data
        )

        # Send to support moderators group
        async_to_sync(channel_layer.group_send)("support_moderators", event_data)
    except Exception:
        logger.exception(
            "Failed to push support.reply_created realtime event",
            extra={"reply_id": getattr(reply, "id", None)},
        )


def push_support_ticket_updated(ticket: SupportTicket) -> None:
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning(
                "Channel layer is not configured or offline. Skipping support.ticket_updated push."
            )
            return

        raw_ticket = SupportTicketSerializer(ticket).data
        ticket_payload = camelize({"ticket": jsonable(raw_ticket)})

        event_data = {"type": "support_ticket_updated", "payload": ticket_payload}

        # Send to ticket user inbox group
        async_to_sync(channel_layer.group_send)(
            f"{CHAT_USER_INBOX_GROUP_PREFIX}.{ticket.user_id}", event_data
        )

        # Send to support moderators group
        async_to_sync(channel_layer.group_send)("support_moderators", event_data)
    except Exception:
        logger.exception(
            "Failed to push support.ticket_updated realtime event",
            extra={"ticket_id": getattr(ticket, "id", None)},
        )


def push_support_ticket_created(ticket: SupportTicket) -> None:
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning(
                "Channel layer is not configured or offline. Skipping support.ticket_created push."
            )
            return

        raw_ticket = SupportTicketSerializer(ticket).data
        ticket_payload = camelize({"ticket": jsonable(raw_ticket)})

        event_data = {"type": "support_ticket_created", "payload": ticket_payload}

        # Send to ticket user inbox group
        async_to_sync(channel_layer.group_send)(
            f"{CHAT_USER_INBOX_GROUP_PREFIX}.{ticket.user_id}", event_data
        )

        # Send to support moderators group
        async_to_sync(channel_layer.group_send)("support_moderators", event_data)
    except Exception:
        logger.exception(
            "Failed to push support.ticket_created realtime event",
            extra={"ticket_id": getattr(ticket, "id", None)},
        )
