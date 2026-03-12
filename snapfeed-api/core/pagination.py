from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BasePagination(PageNumberPagination):
    """
    The custom of page number pagination.
    """

    page_size_query_param = "page_size"

    def get_paginated_response(self, data, **kwargs):
        """
        Get the paginated response.
        """

        response_data = {
            "count": self.page.paginator.count,
            "has_next": self.page.has_next(),
            "num_pages": self.page.paginator.num_pages,
            "results": data,
        }
        response_data.update(kwargs)
        return Response(response_data)
