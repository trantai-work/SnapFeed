from core.pagination import BaseCursorPagination


class VideoCommentPagination(BaseCursorPagination):
    page_size = 10
    ordering = ["-created_at", "-id"]
