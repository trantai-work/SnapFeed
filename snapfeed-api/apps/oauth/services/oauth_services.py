from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from utils import http


def build_oauth_login_response(user: User) -> HttpResponseRedirect:
    """
    Create a redirect response after successful OAuth login.
    """

    refresh = RefreshToken.for_user(user)

    update_last_login(type(user), user)

    response = redirect(settings.CLIENT_HOMEPAGE_URL)

    http.set_auth_cookies(
        response,
        str(refresh.access_token),
        str(refresh),
    )

    return response
