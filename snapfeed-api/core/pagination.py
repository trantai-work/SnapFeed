from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BasePagination(PageNumberPagination):
    """
    Custom page number pagination.
    """

    page_size_query_param = "page_size"

    def get_paginated_response(self, data, **kwargs):
        """
        Get the paginated response.
        """

        pagination_data = {
            "count": self.page.paginator.count,
            "has_next": self.page.has_next(),
            "num_pages": self.page.paginator.num_pages,
            "results": data,
        }

        pagination_data.update(kwargs)

        return Response(
            {
                "status": 200,
                "success": True,
                "message": None,
                "data": pagination_data,
            },
            status=200,
        )
