import logging

from django.conf import settings

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import (
    ParseError,
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
)

from rest_framework_simplejwt.exceptions import InvalidToken

from core.exceptions.base import BaseAPIException
from core.messages import ERROR_MESSAGES

logger = logging.getLogger(__name__)


def build_error_response(message: str, status_code: int, data=None):
    """
    Build standardized API error response.
    """
    return {
        "data": data,
        "message": message,
        "success": False,
        "status_code": status_code,
    }


FRAMEWORK_EXCEPTION_MESSAGES = {
    ParseError: lambda exc, resp: {
        "message": str(exc),
        "data": None,
    },
    ValidationError: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["validation_error"],
        "data": resp.data,
    },
    InvalidToken: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["invalid_token"],
        "data": None,
    },
    AuthenticationFailed: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["invalid_basic_auth"],
        "data": None,
    },
    NotAuthenticated: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["not_authenticated"],
        "data": None,
    },
    PermissionDenied: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["permission_denied"],
        "data": None,
    },
}


def custom_exception_handler(exc, context):
    """
    Global exception handler.

    Handles:
    1. Custom business exceptions
    2. Framework exceptions (DRF / JWT)
    3. Unexpected exceptions
    """

    response = exception_handler(exc, context)

    # Handle custom business exceptions
    if isinstance(exc, BaseAPIException):
        message = ERROR_MESSAGES.get(exc.message_key, exc.message_key)

        return Response(
            build_error_response(
                message=message,
                status_code=exc.status_code,
            ),
            status=exc.status_code,
        )

    # Handle DRF / framework exceptions
    if response is not None:
        for exception_class, handler in FRAMEWORK_EXCEPTION_MESSAGES.items():
            if isinstance(exc, exception_class):
                result = handler(exc, response)

                # Keep original response headers (important for auth headers)
                response.data = build_error_response(
                    message=result.get("message"),
                    data=result.get("data"),
                    status_code=response.status_code,
                )

                return response

        # Fallback for other DRF exceptions
        response.data = build_error_response(
            message=str(response.data),
            status_code=response.status_code,
        )

        return response

    # Unexpected exceptions (bug / system error)
    logger.exception(exc)

    # Keep Django debug page in development
    if settings.DEBUG:
        return None

    # Production fallback
    return Response(
        build_error_response(
            message=ERROR_MESSAGES["common"]["internal_error"],
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
