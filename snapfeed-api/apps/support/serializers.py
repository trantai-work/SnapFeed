from rest_framework import serializers
from apps.support.models import SupportTicket, SupportTicketReply


class SupportTicketReplySerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_avatar_url = serializers.CharField(
        source="sender.avatar_url", read_only=True
    )

    class Meta:
        model = SupportTicketReply
        fields = [
            "id",
            "sender",
            "sender_username",
            "sender_avatar_url",
            "content",
            "created_at",
        ]
        read_only_fields = fields


class SupportTicketSerializer(serializers.ModelSerializer):
    user_avatar_url = serializers.CharField(source="user.avatar_url", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)
    handled_by_username = serializers.CharField(
        source="handled_by.username", read_only=True
    )
    handled_by_avatar_url = serializers.CharField(
        source="handled_by.avatar_url", read_only=True
    )
    replies = SupportTicketReplySerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "user",
            "user_username",
            "user_avatar_url",
            "title",
            "description",
            "status",
            "replies",
            "handled_by",
            "handled_by_username",
            "handled_by_avatar_url",
            "handled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_username",
            "user_avatar_url",
            "status",
            "replies",
            "handled_by",
            "handled_by_username",
            "handled_by_avatar_url",
            "handled_at",
            "created_at",
            "updated_at",
        ]
