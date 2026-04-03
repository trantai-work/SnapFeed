from django.db import models

from apps.users.models import User
from core.models import BaseModel


class Notification(BaseModel):
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="sent_notifications"
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, null=True)

    class Meta:
        db_table = "notifications"


class NotificationRecipient(BaseModel):
    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name="recipients"
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )

    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "notification_recipients"
        constraints = [
            models.UniqueConstraint(
                fields=["notification", "user"], name="unique_notification_user"
            )
        ]
