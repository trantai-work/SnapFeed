from rest_framework import status
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.serializers import UserSerializer
from core.messages import ERROR_MESSAGES, SUCCESS_MESSAGES
from utils import http, api_builder


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data.get("access")
        refresh = serializer.validated_data.get("refresh")
        user = serializer.user

        res = api_builder.build_response(
            data=UserSerializer(user).data,
            message=SUCCESS_MESSAGES["common"]["login_success"],
        )

        http.set_auth_cookies(res, access, refresh)

        return res


class CookieTokenBlacklistView(APIView):
    def post(self, request, *args, **kwargs):  # noqa
        refresh = request.COOKIES.get("refreshToken")

        if not refresh:
            res = api_builder.build_response(
                message=ERROR_MESSAGES["common"]["no_refresh_token_found"],
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        else:
            try:
                token = RefreshToken(refresh)
            except TokenError:
                raise InvalidToken("Invalid refresh token")

            token.blacklist()

            res = api_builder.build_response(
                message=SUCCESS_MESSAGES["common"]["logout_success"],
                status_code=status.HTTP_200_OK,
            )

        http.clear_auth_cookies(res)
        return res


class CookieTokenRefreshView(APIView):
    authentication_classes = []

    def post(self, request, *args, **kwargs):  # noqa
        refresh = request.COOKIES.get("refreshToken")

        if not refresh:
            res = api_builder.build_response(
                message=ERROR_MESSAGES["common"]["no_refresh_token_found"],
                success=False,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
            return res

        try:
            token = RefreshToken(refresh)
        except TokenError:
            raise InvalidToken("Invalid refresh token")

        access = str(token.access_token)

        res = api_builder.build_response(
            message=SUCCESS_MESSAGES["common"]["token_refreshed"],
        )

        http.set_auth_cookies(res, access, refresh)

        return res
