from __future__ import annotations

import re
from collections.abc import Iterable

from django.db import transaction
from django.utils import timezone

from apps.comments.models import VideoComment
from apps.notifications.constants import (
    COMMENT_VIDEO_NOTIFICATION_MESSAGE_TEMPLATE,
    COMMENT_VIDEO_NOTIFICATION_TITLE,
    NotificationCategory,
    REACT_VIDEO_NOTIFICATION_MESSAGE_TEMPLATE,
    REACT_VIDEO_NOTIFICATION_TITLE,
)
from apps.notifications.models import Notification, NotificationRecipient
from apps.notifications.services import notifications_realtime
from apps.users.models import User
from apps.videos.models import Video
from apps.videos.services import reaction_services
from utils.text import truncate_inline


def _format_notification_message(template: str, *, actor: User, **extra: str) -> str:
    first_name = (actor.first_name or "").strip()
    last_name = (actor.last_name or "").strip()
    raw = template.format(first_name=first_name, last_name=last_name, **extra)
    return re.sub(r"\s{2,}", " ", raw).strip()


def _normalize_recipient_users(
    users: Iterable[User],
    *,
    exclude_user_id: int | None,
) -> list[User]:
    """
    Deduplicate users by pk and optionally drop exclude_user_id.
    """

    seen: set[int] = set()
    out: list[User] = []
    for u in users:
        if u is None or u.pk in seen:
            continue
        if exclude_user_id is not None and u.pk == exclude_user_id:
            continue
        seen.add(u.pk)
        out.append(u)
    return out


def create_notification_with_recipients(
    *,
    category: str,
    title: str,
    message: str,
    recipient_users: Iterable[User],
    actor: User | None = None,
    target=None,
    exclude_actor_from_recipients: bool = True,
) -> Notification | None:
    """
    Create a Notification and its NotificationRecipient rows in one transaction.
    Returns None if no recipients remain after filtering.
    """

    exclude_id = actor.pk if (exclude_actor_from_recipients and actor) else None
    normalized = _normalize_recipient_users(recipient_users, exclude_user_id=exclude_id)
    if not normalized:
        return None

    created_recipients: list[NotificationRecipient] = []

    with transaction.atomic():
        notification = Notification.objects.create(
            actor=actor,
            category=category,
            title=title,
            message=message,
            target=target,
        )
        NotificationRecipient.objects.bulk_create(
            [
                NotificationRecipient(notification=notification, user=u)
                for u in normalized
            ],
            ignore_conflicts=True,
        )

        created_recipients = list(
            NotificationRecipient.objects.filter(
                notification=notification, user__in=normalized
            )
            .select_related(
                "notification",
                "notification__actor",
                "notification__target_content_type",
            )
            .order_by("-created_at", "-id")
        )

    transaction.on_commit(
        lambda: notifications_realtime.push_notification_created(created_recipients)
    )

    return notification


def notify_video_react(
    actor: User,
    video: Video,
    *,
    reaction: str | None = None,
    recipient_users: Iterable[User] | None = None,
) -> Notification | None:
    """
    Notify when someone reacts to a video.
    By default notifies the video owner unless the owner is the actor.
    """

    if recipient_users is None:
        if not video.user_id or video.user_id == actor.pk:
            return None
        recipient_users = [video.user]

    reaction_label = reaction_services.react_video_notification_label(reaction)
    title = REACT_VIDEO_NOTIFICATION_TITLE
    message = _format_notification_message(
        REACT_VIDEO_NOTIFICATION_MESSAGE_TEMPLATE,
        actor=actor,
        reaction_label=reaction_label,
    )

    return create_notification_with_recipients(
        category=NotificationCategory.REACT.value,
        title=title,
        message=message,
        recipient_users=recipient_users,
        actor=actor,
        target=video,
    )


def notify_video_comment(
    actor: User,
    comment: VideoComment,
    *,
    recipient_users: Iterable[User] | None = None,
) -> Notification | None:
    """
    Notify when there is a new comment on a video.
    By default notifies the video owner (excluding the actor).
    """

    video = comment.video

    if recipient_users is None:
        if not video.user_id or video.user_id == actor.pk:
            return None
        recipient_users = [video.user]

    title = COMMENT_VIDEO_NOTIFICATION_TITLE
    comment_excerpt = truncate_inline(comment.content, max_len=90) or "..."
    message = _format_notification_message(
        COMMENT_VIDEO_NOTIFICATION_MESSAGE_TEMPLATE,
        actor=actor,
        comment_excerpt=comment_excerpt,
    )

    return create_notification_with_recipients(
        category=NotificationCategory.COMMENT.value,
        title=title,
        message=message,
        recipient_users=recipient_users,
        actor=actor,
        target=comment,
    )


def notify_system(
    title: str,
    message: str,
    recipient_users: Iterable[User],
    *,
    target=None,
) -> Notification | None:
    """
    System or admin notification with no actor.
    """

    return create_notification_with_recipients(
        category=NotificationCategory.SYSTEM.value,
        title=title,
        message=message,
        recipient_users=recipient_users,
        actor=None,
        target=target,
        exclude_actor_from_recipients=False,
    )


def mark_read(recipient: NotificationRecipient) -> NotificationRecipient:
    """
    Mark a NotificationRecipient row as read (idempotent).
    """

    if recipient.is_read:
        return recipient

    recipient.is_read = True
    recipient.read_at = timezone.now()
    recipient.save(update_fields=["is_read", "read_at", "updated_at"])

    transaction.on_commit(
        lambda: notifications_realtime.push_notification_read(recipient)
    )

    return recipient


def get_unread_count(*, user: User) -> int:
    """
    Return unread notification recipient count for the given user.
    """

    return NotificationRecipient.objects.filter(user=user, is_read=False).count()
