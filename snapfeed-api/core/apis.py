from rest_framework import viewsets, status

from utils.api_builder import build_response
from core.pagination import BasePagination


class BaseAPIViewSet(viewsets.GenericViewSet):
    """
    Base ViewSet with unified API response template.
    """

    def response(self, data=None, message=None, status_code=status.HTTP_200_OK):  # noqa
        return build_response(data=data, message=message, status_code=status_code)

    def response_ok(self, data=None, message=None):  # noqa
        return self.response(data=data, message=message)

    def response_created(self, data=None, message=None):  # noqa
        return self.response(
            data=data,
            message=message,
            status_code=status.HTTP_201_CREATED,
        )

    def response_no_content(self, message=None):  # noqa
        return self.response(
            data=None,
            message=message,
            status_code=status.HTTP_204_NO_CONTENT,
        )

    def response_error(  # noqa
        self,
        message=None,
        status_code=status.HTTP_400_BAD_REQUEST,
    ):
        return build_response(
            data=None,
            message=message,
            success=False,
            status_code=status_code,
        )

    def response_pagination(
        self,
        request,
        queryset,
        serializer_class,
        pagination_class=BasePagination,
        extra_context=None,
    ):
        """
        Custom paginated response.
        """

        paginator = pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)

        context = {"request": request}

        if extra_context:
            context.update(extra_context)

        serializer = serializer_class(page, many=True, context=context)

        return paginator.get_paginated_response(serializer.data)
