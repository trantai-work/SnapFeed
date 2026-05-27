from django.db import models
from apps.users.models import User

from apps.support.constants import SupportTicketStatus
from core.models import BaseModel


class SupportTicket(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="support_tickets"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=SupportTicketStatus.choices(),
        default=SupportTicketStatus.PENDING.value,
    )

    handled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_support_tickets",
    )
    handled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "support_tickets"
        ordering = ["-created_at"]


class SupportTicketReply(BaseModel):
    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name="replies"
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="support_replies"
    )
    content = models.TextField()

    class Meta:
        db_table = "support_ticket_replies"
        ordering = ["created_at"]
