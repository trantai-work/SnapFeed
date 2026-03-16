from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView

from core.apis.api_builder import build_response


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        access = response.data.get("access")
        refresh = response.data.get("refresh")

        res = build_response()

        res.set_cookie(
            key="accessToken",
            value=access,
            httponly=True,
            samesite="Lax",
            secure=not settings.DEBUG,
            path="/",
        )

        res.set_cookie(
            key="refreshToken",
            value=refresh,
            httponly=True,
            samesite="Lax",
            secure=not settings.DEBUG,
            path="/",
        )

        return res
