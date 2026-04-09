from rest_framework import viewsets, status
from rest_framework import status as drf_status
from rest_framework.response import Response

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


class WrappedResponseMixin:
    """
    Wrap default DRF mixin responses into the project's unified response envelope.

    Notes:
    - We intentionally do NOT override `list()`. Our pagination classes already wrap list responses
      via `get_paginated_response()`, and wrapping again would double-nest the payload.
    - For non-paginated endpoints (retrieve/create/update/...), DRF mixins return raw data by
      default, so we wrap them here.
    """

    def retrieve(self, request, *args, **kwargs):
        resp: Response = super().retrieve(request, *args, **kwargs)
        return self.response_ok(resp.data)

    def create(self, request, *args, **kwargs):
        resp: Response = super().create(request, *args, **kwargs)
        return self.response_created(resp.data)

    def update(self, request, *args, **kwargs):
        resp: Response = super().update(request, *args, **kwargs)
        return self.response_ok(resp.data)

    def partial_update(self, request, *args, **kwargs):
        resp: Response = super().partial_update(request, *args, **kwargs)
        return self.response_ok(resp.data)

    def destroy(self, request, *args, **kwargs):
        resp: Response = super().destroy(request, *args, **kwargs)
        if resp.status_code == drf_status.HTTP_204_NO_CONTENT:
            return self.response_no_content()
        return self.response_ok(resp.data)
