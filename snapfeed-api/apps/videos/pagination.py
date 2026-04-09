from core.pagination import BaseCursorPagination


class VideCursorPagination(BaseCursorPagination):
    page_size = 10
    ordering = ["-created_at", "-id"]
