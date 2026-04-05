from rest_framework import serializers

from apps.notifications.models import Notification, NotificationRecipient
from apps.users.serializers import UserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True, allow_null=True)
    target = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "category",
            "title",
            "message",
            "actor",
            "target",
            "created_at",
        ]
        read_only_fields = fields

    def get_target(self, obj: Notification):
        ct = obj.target_content_type
        if ct is None or obj.target_object_id is None:
            return None
        return {
            "type": f"{ct.app_label}.{ct.model}",
            "id": obj.target_object_id,
        }


class NotificationRecipientSerializer(serializers.ModelSerializer):
    notification = NotificationSerializer(read_only=True)

    class Meta:
        model = NotificationRecipient
        fields = ["id", "is_read", "read_at", "created_at", "notification"]
        read_only_fields = fields
