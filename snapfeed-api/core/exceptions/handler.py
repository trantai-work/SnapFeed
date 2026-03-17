import logging

from django.conf import settings

from rest_framework.views import exception_handler
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
from utils import api_builder

logger = logging.getLogger(__name__)


FRAMEWORK_EXCEPTION_MESSAGES = {
    ParseError: lambda exc, resp: {
        "message": str(exc),
        "data": None,
        "status_code": status.HTTP_400_BAD_REQUEST,
    },
    ValidationError: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["validation_error"],
        "data": resp.data,
        "status_code": status.HTTP_400_BAD_REQUEST,
    },
    InvalidToken: lambda exc, resp: {  # Use for both access and refresh token
        "message": ERROR_MESSAGES["common"]["invalid_token"],
        "data": None,
        "status_code": status.HTTP_401_UNAUTHORIZED,
    },
    AuthenticationFailed: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["invalid_basic_auth"],
        "data": None,
        "status_code": status.HTTP_401_UNAUTHORIZED,
    },
    NotAuthenticated: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["not_authenticated"],
        "data": None,
        "status_code": status.HTTP_401_UNAUTHORIZED,
    },
    PermissionDenied: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["permission_denied"],
        "data": None,
        "status_code": status.HTTP_403_FORBIDDEN,
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

        return api_builder.build_response(
            message=message, status_code=exc.status_code, success=False
        )

    # Handle DRF / framework exceptions
    if response is not None:
        for exception_class, handler in FRAMEWORK_EXCEPTION_MESSAGES.items():
            if isinstance(exc, exception_class):
                result = handler(exc, response)

                status_code = result.get("status_code", response.status_code)

                response.status_code = status_code

                response.data = api_builder.build_response_body(
                    message=result.get("message"),
                    data=result.get("data"),
                    success=False,
                    status_code=status_code,
                )

                return response

        # Fallback for other DRF exceptions
        response.data = api_builder.build_response_body(
            message=str(response.data), success=False, status_code=response.status_code
        )

        return response

    # Unexpected exceptions (bug / system error)
    logger.exception(exc)

    # Keep Django debug page in development
    if settings.DEBUG:
        return None

    # Production fallback
    return api_builder.build_response(
        message=ERROR_MESSAGES["common"]["internal_error"],
        success=False,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
