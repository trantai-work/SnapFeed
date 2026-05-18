from django.utils import timezone
from apps.notifications.services.notification_services import notify_system
from apps.support.constants import SupportTicketStatus, SUPPORT_REPLY_NOTIFICATION_TITLE
from core.messages import SUCCESS_MESSAGES


def process_support_ticket_update(ticket, reply_content, status_val, moderator):
    """
    Process SupportTicket updates from Moderator, including replying and status changes.
    """

    from apps.support.models import SupportTicketReply

    is_replying = (
        bool(reply_content) and ticket.status == SupportTicketStatus.PENDING.value
    )

    if reply_content:
        SupportTicketReply.objects.create(
            ticket=ticket, sender=moderator, content=reply_content
        )

    if is_replying:
        ticket.status = SupportTicketStatus.REPLIED.value
    else:
        ticket.status = status_val

    ticket.handled_by = moderator
    ticket.handled_at = timezone.now()
    ticket.save()

    if is_replying:
        msg = SUCCESS_MESSAGES["ticket_replied"]
        notify_system(
            title=SUPPORT_REPLY_NOTIFICATION_TITLE,
            message=msg,
            recipient_users=[ticket.user],
            target=ticket,
        )

    return ticket
