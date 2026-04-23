from rest_framework import status
from rest_framework.exceptions import (
    ParseError,
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
)

from rest_framework_simplejwt.exceptions import InvalidToken

from apps.chats.exceptions import UserNotInConversationError
from apps.users.exceptions import CannotFollowYourselfError, HaveNotFollowUserError
from apps.videos.exceptions import (
    InvalidS3KeyFormatError,
    NotVideoOwnerError,
    S3ObjectNotFoundError,
    VideoWithS3KeyNotFound,
)
from core.exceptions.handler_helpers import extract_validation_messages
from core.messages import ERROR_MESSAGES

FRAMEWORK_EXCEPTION_MESSAGES = {
    ParseError: lambda exc, resp: {
        "message": str(exc),
        "data": None,
        "status_code": status.HTTP_400_BAD_REQUEST,
    },
    ValidationError: lambda exc, resp: {
        "message": extract_validation_messages(resp.data),
        "data": None,
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

DOMAIN_EXCEPTION_STATUS_MAP = {
    InvalidS3KeyFormatError: status.HTTP_400_BAD_REQUEST,
    NotVideoOwnerError: status.HTTP_403_FORBIDDEN,
    S3ObjectNotFoundError: status.HTTP_400_BAD_REQUEST,
    VideoWithS3KeyNotFound: status.HTTP_400_BAD_REQUEST,
    UserNotInConversationError: status.HTTP_400_BAD_REQUEST,
    CannotFollowYourselfError: status.HTTP_400_BAD_REQUEST,
    HaveNotFollowUserError: status.HTTP_400_BAD_REQUEST,
}
