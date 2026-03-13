from rest_framework import status

from core.exceptions.base import BaseAPIException


class NotFoundException(BaseAPIException):
    """
    Raised when a requested resource cannot be found.
    """

    status_code = status.HTTP_404_NOT_FOUND


class BusinessException(BaseAPIException):
    """
    Raised when a business rule is violated.
    """

    status_code = status.HTTP_400_BAD_REQUEST


class InfrastructureException(BaseAPIException):
    """
    Raised when an internal system or infrastructure error occurs.
    """

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
