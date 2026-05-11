from __future__ import annotations


from django.db import transaction
from django.db.models import Prefetch
from django.db.models import (
    Case,
    Count,
    DateTimeField,
    IntegerField,
    OuterRef,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.chats.constants import ConversationType
from apps.chats.exceptions import UserNotInConversationError
from apps.chats.models import Conversation, ConversationParticipant, Message
from apps.users.models import User


def build_direct_key(a: int, b: int) -> str:
    low, high = (a, b) if a < b else (b, a)
    return f"{low}:{high}"


def check_conversation_access(conversation: Conversation, user: User) -> None:
    ok = ConversationParticipant.objects.filter(
        conversation_id=conversation.id, user=user
    ).exists()
    if not ok:
        raise UserNotInConversationError()


def annotate_conversations_for_user(user: User):
    base = (
        Conversation.objects.filter(participants__user=user)
        .prefetch_related(
            Prefetch(
                "participants",
                queryset=ConversationParticipant.objects.select_related("user")
                .only(
                    "id",
                    "conversation_id",
                    "user_id",
                    "user__id",
                    "user__username",
                    "user__first_name",
                    "user__last_name",
                    "user__avatar_url",
                )
                .order_by("user_id"),
                to_attr="_prefetched_participants",
            )
        )
        .distinct()
    )

    last_msg = Message.objects.filter(conversation_id=OuterRef("pk")).order_by("-id")
    base = base.annotate(
        last_message_id=Subquery(last_msg.values("id")[:1]),
        last_message_content=Subquery(last_msg.values("content")[:1]),
        last_message_attachment_type=Subquery(last_msg.values("attachment_type")[:1]),
        last_message_created_at=Subquery(last_msg.values("created_at")[:1]),
        last_message_sender_id=Subquery(last_msg.values("sender_id")[:1]),
        last_message_sender_username=Subquery(last_msg.values("sender__username")[:1]),
        last_message_sender_first_name=Subquery(
            last_msg.values("sender__first_name")[:1]
        ),
        last_message_sender_last_name=Subquery(
            last_msg.values("sender__last_name")[:1]
        ),
        last_message_sender_avatar_url=Subquery(
            last_msg.values("sender__avatar_url")[:1]
        ),
    )

    # When used directly on the outer Conversation queryset.
    participant_last_read_at = Subquery(
        ConversationParticipant.objects.filter(
            conversation_id=OuterRef("pk"), user=user
        ).values("last_read_at")[:1],
        output_field=DateTimeField(),
    )
    base = base.annotate(participant_last_read_at=participant_last_read_at)

    participant_last_read_at_for_message = Subquery(
        ConversationParticipant.objects.filter(
            conversation_id=OuterRef("conversation_id"), user=user
        ).values("last_read_at")[:1],
        output_field=DateTimeField(),
    )

    unread_base = Message.objects.filter(conversation_id=OuterRef("pk")).exclude(
        sender_id=user.id
    )
    unread_all = Subquery(
        unread_base.values("conversation").annotate(c=Count("id")).values("c")[:1]
    )
    unread_after = Subquery(
        unread_base.filter(created_at__gt=participant_last_read_at_for_message)
        .values("conversation")
        .annotate(c=Count("id"))
        .values("c")[:1]
    )
    base = base.annotate(
        unread_count=Case(
            When(type=ConversationType.SELF.value, then=Value(0)),
            When(
                participant_last_read_at__isnull=True,
                then=Coalesce(unread_all, Value(0), output_field=IntegerField()),
            ),
            default=Coalesce(unread_after, Value(0), output_field=IntegerField()),
            output_field=IntegerField(),
        )
    )

    return base.order_by("-last_message_at", "-id")


def get_conversation_unread_count(user: User) -> int:
    """
    Get unread *conversation* count of a user.
    """

    qs = annotate_conversations_for_user(user).filter(last_message_at__isnull=False)
    return qs.filter(unread_count__gt=0).count()


def get_or_create_direct_conversation(me: User, other: User) -> Conversation:
    key = build_direct_key(me.id, other.id)
    with transaction.atomic():
        is_self = me.id == other.id
        conv_type = (
            ConversationType.SELF.value if is_self else ConversationType.DIRECT.value
        )
        conv, _ = Conversation.objects.get_or_create(
            type=conv_type,
            direct_key=key,
            defaults={"created_by_id": me.id},
        )
        ConversationParticipant.objects.get_or_create(conversation=conv, user=me)
        if not is_self:
            ConversationParticipant.objects.get_or_create(conversation=conv, user=other)
    return conv


def create_message(
    conversation: Conversation,
    sender: User,
    content: str | None = None,
    attachment_key: str | None = None,
    attachment_name: str | None = None,
    attachment_size: int | None = None,
    attachment_type: str | None = None,
) -> Message:
    msg = Message.objects.create(
        conversation_id=conversation.id,
        sender=sender,
        content=content,
        attachment_key=attachment_key,
        attachment_name=attachment_name,
        attachment_size=attachment_size,
        attachment_type=attachment_type,
    )
    Conversation.objects.filter(id=conversation.id).update(
        last_message_at=msg.created_at
    )
    return msg


def mark_read(
    *,
    conversation: Conversation,
    user: User,
    up_to_message_id: int | None = None,
    read_at=None,
):
    if up_to_message_id:
        row = (
            Message.objects.filter(conversation=conversation, id=up_to_message_id)
            .values("created_at")
            .first()
        )
        read_at = row["created_at"] if row else None
    else:
        # Default to the latest message from other users.
        row = (
            Message.objects.filter(conversation=conversation)
            .exclude(sender_id=user.id)
            .order_by("-id")
            .values("created_at")
            .first()
        )
        read_at = row["created_at"] if row else None

    read_at = read_at or timezone.now()

    ConversationParticipant.objects.filter(conversation=conversation, user=user).update(
        last_read_at=read_at
    )

    return read_at
