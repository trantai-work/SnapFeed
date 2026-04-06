from core.pagination import BaseCursorPagination


class NotificationPagination(BaseCursorPagination):
    """
    Cursor pagination for the current user's notification feed.
    """

    page_size = 10
    ordering = ["-created_at", "-id"]
