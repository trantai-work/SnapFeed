from core.pagination import BaseCursorPagination


class MessagePagination(BaseCursorPagination):
    ordering = "-id"
    page_size = 20


class ConversationPagination(BaseCursorPagination):
    ordering = ["-last_message_at", "-id"]
    page_size = 20
