from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.notifications.constants import NotificationCategory
from apps.users.models import User
from core.models import BaseModel


class Notification(BaseModel):
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="sent_notifications"
    )
    category = models.CharField(
        max_length=20,
        choices=NotificationCategory.choices(),
        default=NotificationCategory.SYSTEM.value,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()

    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    target_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")

    class Meta:
        db_table = "notifications"
        indexes = [
            models.Index(
                fields=["target_content_type", "target_object_id"],
                name="notif_target_ct_oid_idx",
            ),
        ]


class NotificationRecipient(BaseModel):
    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name="recipients"
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notification_recipients"
        constraints = [
            models.UniqueConstraint(
                fields=["notification", "user"], name="unique_notification_user"
            )
        ]
