from rest_framework.exceptions import AuthenticationFailed as DRFAuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import (
    AuthenticationFailed as SimpleJWTAuthenticationFailed,
)


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom authentication class that extends SimpleJWT's JWTAuthentication
    to support retrieving the JWT access token from cookies.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get("accessToken")
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)

        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):
        try:
            return super().get_user(validated_token)
        except SimpleJWTAuthenticationFailed as exc:
            if (
                isinstance(exc.detail, dict)
                and exc.detail.get("code") == "user_inactive"
            ):
                raise DRFAuthenticationFailed("User is inactive", code="user_inactive")
            raise exc
