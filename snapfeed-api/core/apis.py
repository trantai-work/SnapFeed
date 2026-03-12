from typing import Dict

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status

from core.messages import ERROR_MESSAGES
from core.pagination import BasePagination


class BaseAPIViewSet(viewsets.GenericViewSet):
    """
    The BaseAPIViewSet class does not provide any actions by default,
    but does include the base set of generic view behavior, such as
    the `get_object` and `get_queryset` methods.
    """

    @staticmethod
    def response(data: Dict = None, status_code=status.HTTP_200_OK) -> Response:
        """
        Custom response for ViewSet.
        """

        return Response(data=data, status=status_code)

    @staticmethod
    def response_ok(data: Dict = None) -> Response:
        """
        Custom default response OK for ViewSet.
        """

        return Response(data=data, status=status.HTTP_200_OK)

    @staticmethod
    def response_error(msg_key: str, status_code=status.HTTP_401_UNAUTHORIZED):
        """
        Custom default response error for ViewSet.
        """

        return Response(data={"message": ERROR_MESSAGES[msg_key]}, status=status_code)

    @staticmethod
    def response_created(data: Dict = None) -> Response:
        """
        Custom default response created for ViewSet.
        """

        return Response(data=data, status=status.HTTP_201_CREATED)

    def response_pagination(
        self,
        request,
        queryset,
        serializer,
        pagination_class=BasePagination,
        extra_context: dict = None,
    ):
        """
        Custom paginated response.

        Args:
            request (Request): The HTTP request.
            queryset (Queryset): The queryset.
            serializer (Serializer): The serializer.
            pagination_class (BasePagination, optional): The pagination class.
            Defaults to BasePagination.
            extra_context (dict, optional): The extra context params.

        Returns:
            Any: The response after paginated based on class.
        """

        # Config pagination
        self.pagination_class = pagination_class
        page = self.paginate_queryset(queryset)

        if extra_context is None:
            extra_context = {}

        context = {"request": request, **extra_context}

        serializer = serializer(page, many=True, context=context)

        return self.get_paginated_response(serializer.data)
