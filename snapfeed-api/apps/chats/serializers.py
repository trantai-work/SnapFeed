from __future__ import annotations

from rest_framework import serializers

from apps.chats.models import Conversation, Message
from apps.users.models import User


class DMSerializer(serializers.Serializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())


class MarkReadSerializer(serializers.Serializer):
    up_to_message_id = serializers.IntegerField(required=False, min_value=1)


class ChatUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "avatar_url")


class MessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "conversation",
            "sender",
            "content",
            "attachment_key",
            "attachment_name",
            "attachment_size",
            "attachment_type",
            "created_at",
        )
        read_only_fields = ("id", "sender", "created_at")


class AttachmentUploadSerializer(serializers.Serializer):
    conversation = serializers.PrimaryKeyRelatedField(
        queryset=Conversation.objects.all()
    )
    file_name = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100)


class AttachmentDownloadSerializer(serializers.Serializer):
    key = serializers.CharField()
    filename = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class ConversationSerializer(serializers.ModelSerializer):
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "type",
            "title",
            "direct_key",
            "last_message_at",
            "participants",
            "unread_count",
            "last_message",
            "created_at",
            "updated_at",
        )

    def get_unread_count(self, obj: Conversation) -> int:
        return int(getattr(obj, "unread_count", 0) or 0)

    def get_last_message(self, obj: Conversation):
        last_id = getattr(obj, "last_message_id", None)
        if not last_id:
            return None
        return {
            "id": last_id,
            "content": getattr(obj, "last_message_content", None),
            "attachment_type": getattr(obj, "last_message_attachment_type", None),
            "created_at": getattr(obj, "last_message_created_at", None),
            "sender_id": getattr(obj, "last_message_sender_id", None),
            "sender": {
                "id": getattr(obj, "last_message_sender_id", None),
                "username": getattr(obj, "last_message_sender_username", None),
                "first_name": getattr(obj, "last_message_sender_first_name", None),
                "last_name": getattr(obj, "last_message_sender_last_name", None),
                "avatar_url": getattr(obj, "last_message_sender_avatar_url", None),
            },
        }

    def get_participants(self, obj: Conversation):
        prefetched = getattr(obj, "_prefetched_participants", None)
        if prefetched is None:
            return None

        users = [p.user for p in prefetched if getattr(p, "user", None)]
        return ChatUserSerializer(users, many=True).data
