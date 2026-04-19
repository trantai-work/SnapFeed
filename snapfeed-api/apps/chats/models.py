from django.db import models

from apps.chats.constants import ConversationType
from apps.users.models import User
from core.models import BaseModel


class Conversation(BaseModel):
    type = models.CharField(
        max_length=16,
        choices=ConversationType.choices(),
        default=ConversationType.DIRECT.value,
    )
    title = models.CharField(max_length=255, blank=True, default="")

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_conversations",
    )

    # For direct conversations, this can be used to guarantee uniqueness
    # (e.g. "12:34" where ids are sorted).
    direct_key = models.CharField(max_length=64, unique=True, null=True, blank=True)

    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "chat_conversations"
        indexes = [
            models.Index(fields=["type", "last_message_at"]),
        ]


class ConversationParticipant(BaseModel):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="participants"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="chat_participations"
    )

    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    is_muted = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = "chat_conversation_participants"
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "user"], name="uniq_chat_conversation_user"
            )
        ]
        indexes = [
            models.Index(fields=["user", "conversation"]),
            models.Index(fields=["conversation", "user"]),
        ]


class Message(BaseModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )

    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )
    content = models.TextField(null=False, blank=False)

    class Meta:
        db_table = "messages"
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
        ]


class MessageRead(BaseModel):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reads")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="message_reads"
    )
    read_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "message_reads"
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user"], name="uniq_message_read_message_user"
            )
        ]
        indexes = [
            models.Index(fields=["user", "read_at"]),
            models.Index(fields=["message", "read_at"]),
        ]
