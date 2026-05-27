from enum import Enum


class SupportTicketStatus(Enum):
    PENDING = "pending"
    REPLIED = "replied"
    CLOSED = "closed"

    @classmethod
    def choices(cls):
        return [(key.value, key.name) for key in cls]


SUPPORT_REPLY_NOTIFICATION_TITLE = "Phản hồi từ hỗ trợ SnapFeed"
