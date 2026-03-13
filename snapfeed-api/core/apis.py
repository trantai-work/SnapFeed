from typing import Any

from rest_framework import viewsets, status
from rest_framework.response import Response

from core.messages import ERROR_MESSAGES
from core.pagination import BasePagination


class BaseAPIViewSet(viewsets.GenericViewSet):
    """
    Base ViewSet with unified API response template.
    """

    @staticmethod
    def build_response(
        data: Any = None,
        message: str = None,
        success: bool = True,
        status_code=status.HTTP_200_OK,
    ) -> Response:
        """
        Build standardized API response.
        """

        return Response(
            {
                "status": status_code,
                "success": success,
                "message": message,
                "data": data,
            },
            status=status_code,
        )

    @classmethod
    def response(cls, data=None, status_code=status.HTTP_200_OK):
        return cls.build_response(data=data, status_code=status_code)

    @classmethod
    def response_ok(cls, data=None):
        return cls.build_response(data=data)

    @classmethod
    def response_created(cls, data=None):
        return cls.build_response(data=data, status_code=status.HTTP_201_CREATED)

    @classmethod
    def response_error(cls, msg_key: str, status_code=status.HTTP_401_UNAUTHORIZED):
        return cls.build_response(
            data=None,
            message=ERROR_MESSAGES[msg_key],
            success=False,
            status_code=status_code,
        )

    def response_pagination(
        self,
        request,
        queryset,
        serializer,
        pagination_class=BasePagination,
        extra_context=None,
    ):
        """
        Custom paginated response.
        """

        self.pagination_class = pagination_class
        page = self.paginate_queryset(queryset)

        if extra_context is None:
            extra_context = {}

        context = {"request": request, **extra_context}

        serializer = serializer(page, many=True, context=context)

        return self.get_paginated_response(serializer.data)
