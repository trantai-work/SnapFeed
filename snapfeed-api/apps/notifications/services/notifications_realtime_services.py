from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import models
from apps.notifications.constants import NOTIFICATIONS_USER_GROUP_PREFIX
from apps.notifications.models import NotificationRecipient
from apps.notifications.serializers import NotificationRecipientSerializer

logger = logging.getLogger(__name__)


def push_notification_created(recipients: list[NotificationRecipient]) -> None:
    """
    Push newly created NotificationRecipient rows.
    """

    if not recipients:
        return

    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        user_ids = {r.user_id for r in recipients}
        unread_map = {
            row["user_id"]: row["c"]
            for row in NotificationRecipient.objects.filter(
                user_id__in=user_ids, is_read=False
            )
            .values("user_id")
            .annotate(c=models.Count("id"))
        }

        for r in recipients:
            payload = {
                "recipient": NotificationRecipientSerializer(r).data,
                "unread_count": int(unread_map.get(r.user_id, 0)),
            }
            async_to_sync(channel_layer.group_send)(
                f"{NOTIFICATIONS_USER_GROUP_PREFIX}.{r.user_id}",
                {"type": "notification_created", "payload": payload},
            )
    except Exception:
        logger.exception(
            "Failed to push notification.created realtime event",
            extra={
                "recipient_ids": [r.id for r in recipients],
                "user_ids": [r.user_id for r in recipients],
            },
        )


def push_notification_read(recipient: NotificationRecipient) -> None:
    """
    Push a read NotificationRecipient.
    """

    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        unread = NotificationRecipient.objects.filter(
            user=recipient.user, is_read=False
        ).count()
        payload = {"recipient_id": recipient.id, "unread_count": unread}
        async_to_sync(channel_layer.group_send)(
            f"{NOTIFICATIONS_USER_GROUP_PREFIX}.{recipient.user_id}",
            {"type": "notification_read", "payload": payload},
        )
    except Exception:
        logger.exception(
            "Failed to push notification.read realtime event",
            extra={
                "recipient_id": recipient.id,
                "user_id": recipient.user_id,
                "notification_id": recipient.notification_id,
            },
        )
