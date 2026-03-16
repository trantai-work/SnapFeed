from django.contrib.auth.models import update_last_login
from django.shortcuts import redirect
from drf_spectacular.utils import extend_schema
from google.auth.exceptions import GoogleAuthError
from rest_framework import status
from rest_framework.decorators import action
from django.conf import settings
from django.db import transaction
import requests
from rest_framework_simplejwt.tokens import RefreshToken

from apps.oauth.services import social_account_services
from apps.users.services import user_services
from core.apis.api_viewset import BaseAPIViewSet
from core.serializers import EmptySerializer
from apps.oauth.constants import OAuth2Providers
from utils import random
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import logging

logger = logging.getLogger(__name__)


@extend_schema(tags=["auth"])
class OAuthViewSet(BaseAPIViewSet):
    serializer_class = EmptySerializer

    @transaction.atomic()
    @action(detail=False, methods=["get"], url_path="google/callback")
    def google_callback(self, request):
        code = request.GET.get("code")

        if not code:
            return self.response_error(
                msg_key="missing_google_exchange_code",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange code for token
        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        token_response = requests.post(
            settings.GOOGLE_TOKEN_URL,
            data=data,
        )

        token_data = token_response.json()

        id_token_str = token_data.get("id_token")

        # Verify id_token
        try:
            payload = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except (ValueError, GoogleAuthError) as e:
            logger.warning("Google OAuth2 token verification failed: %s", str(e))
            return self.response_error(
                msg_key="verify_google_oauth2_token_fail",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        provider = OAuth2Providers.GOOGLE.value
        provider_user_id = payload.get("sub")

        email = payload.get("email")
        email_verified = payload.get("email_verified")

        given_name = payload.get("given_name") or ""
        family_name = payload.get("family_name") or ""

        # Find social account
        social_account = social_account_services.get_social_account(
            provider,
            provider_user_id,
        )

        if social_account:
            user = social_account.user

        else:
            user = None

            # Only link by email if verified
            if email and email_verified:
                user = user_services.find_user_by_email(email)

            # If user not exist -> create
            if user is None:
                user = user_services.create_user(
                    username=random.generate_username(),
                    password=None,
                    email=email if email_verified else None,
                    first_name=given_name,
                    last_name=family_name,
                )

            social_account_services.create_social_account(
                user,
                provider,
                provider_user_id,
            )

        # Issue JWT
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        update_last_login(type(user), user)

        response = redirect(settings.CLIENT_HOMEPAGE_URL)

        # Access token cookie
        response.set_cookie(
            key="accessToken",
            value=access_token,
            max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            path="/",
        )

        # Refresh token cookie
        response.set_cookie(
            key="refreshToken",
            value=str(refresh),
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
            path="/",
        )

        return response
