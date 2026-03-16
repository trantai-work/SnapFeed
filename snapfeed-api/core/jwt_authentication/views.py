from rest_framework_simplejwt.views import TokenObtainPairView

from utils import http, api_builder


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        access = response.data.get("access")
        refresh = response.data.get("refresh")

        res = api_builder.build_response()

        http.set_auth_cookies(res, access, refresh)

        return res
