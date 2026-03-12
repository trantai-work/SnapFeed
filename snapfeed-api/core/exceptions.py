from rest_framework.views import exception_handler
from rest_framework.exceptions import (
    ParseError,
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
)
from rest_framework_simplejwt.exceptions import InvalidToken

from core.messages import ERROR_MESSAGES

EXCEPTION_MESSAGES = {
    ParseError: lambda exc, resp: {"message": str(exc)},
    ValidationError: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["validation_error"],
        "errors": resp.data,
    },
    InvalidToken: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["invalid_token"]
    },
    AuthenticationFailed: lambda exc, resp: {"message": exc.detail["detail"]},
    NotAuthenticated: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["not_authenticated"]
    },
    PermissionDenied: lambda exc, resp: {
        "message": ERROR_MESSAGES["common"]["permission_denied"]
    },
}


def custom_exception_handler(exc, context):
    """
    Custom exception handler.
    """

    response = exception_handler(exc, context)

    if response is None:
        return response

    for exception_classes, handler in EXCEPTION_MESSAGES.items():
        if isinstance(exc, exception_classes):
            response.data = handler(exc, response)
            break

    return response
