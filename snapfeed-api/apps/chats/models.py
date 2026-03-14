from django.db import models

from apps.users.models import User
from core.models import BaseModel


class Message(BaseModel):
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_messages"
    )

    receiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_messages"
    )

    content = models.TextField()

    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "messages"
