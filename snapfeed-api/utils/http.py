from django.conf import settings


def set_auth_cookies(response, access_token: str, refresh_token: str) -> None:
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
