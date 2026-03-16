from rest_framework.pagination import PageNumberPagination
from core.apis.api_builder import build_response


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

        return build_response(
            data=pagination_data,
        )
