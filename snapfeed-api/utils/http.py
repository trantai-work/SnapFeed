from django.conf import settings
from rest_framework.response import Response


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """
    Attach authentication tokens to the response cookies.

    Args:
        response: Django HttpResponse object.
        access_token (str): JWT access token.
        refresh_token (str): JWT refresh token.
    """

    response.set_cookie(
        key="accessToken",
        value=access_token,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/",
    )

    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        "accessToken",
        path="/",
        samesite="Lax",
    )
    response.delete_cookie(
        "refreshToken",
        path="/",
        samesite="Lax",
    )
