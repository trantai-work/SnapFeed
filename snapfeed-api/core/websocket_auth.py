from __future__ import annotations

import logging
from http.cookies import SimpleCookie

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)


@sync_to_async
def _get_user_from_token(raw_token: str):
    jwt_auth = JWTAuthentication()
    validated = jwt_auth.get_validated_token(raw_token)
    return jwt_auth.get_user(validated)


class CookieJWTAuthMiddleware(BaseMiddleware):
    """
    Channels auth middleware that reads SimpleJWT access token from cookies.

    Cookie key matches core.jwt_authentication.authentication.CookieJWTAuthentication:
    - accessToken
    """

    async def __call__(self, scope, receive, send):
        scope["user"] = AnonymousUser()

        headers = dict(scope.get("headers") or [])
        cookie_header = headers.get(b"cookie")
        if cookie_header:
            cookie = SimpleCookie()
            cookie.load(cookie_header.decode("latin-1"))
            access = cookie.get("accessToken")
            raw_token = access.value if access else None
            if raw_token:
                try:
                    scope["user"] = await _get_user_from_token(raw_token)
                except (InvalidToken, TokenError) as e:
                    # Expected failure when token is expired/invalid.
                    logger.info(
                        "WebSocket JWT invalid/expired: %s", e.__class__.__name__
                    )
                    scope["user"] = AnonymousUser()
                except Exception:
                    logger.exception("Unexpected error validating WebSocket JWT")
                    scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
