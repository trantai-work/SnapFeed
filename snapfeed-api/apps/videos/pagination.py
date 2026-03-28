from core.pagination import BaseCursorPagination


class FeedPagination(BaseCursorPagination):
    """
    Cursor pagination for feed API.
    """

    ordering = ["distance", "id"]
