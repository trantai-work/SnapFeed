from core.pagination import BaseCursorPagination


class UserFollowPagination(BaseCursorPagination):
    """
    Cursor pagination for followers/following lists.
    """

    page_size = 20
    ordering = ["-id"]
