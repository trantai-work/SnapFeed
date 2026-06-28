from django.shortcuts import redirect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from django.conf import settings
from django.db import transaction
import requests

from apps.oauth.services import oauth_services
from apps.users.services import user_services
from core.apis import BaseAPIViewSet
from core.messages import ERROR_MESSAGES
from core.serializers import EmptySerializer
from apps.oauth.constants import OAuth2Providers
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from utils import http
import logging


logger = logging.getLogger(__name__)


@extend_schema(tags=["auth"])
class OAuthViewSet(BaseAPIViewSet):
    authentication_classes = []
    serializer_class = EmptySerializer

    @transaction.atomic()
    @action(detail=False, methods=["get"], url_path="google/callback")
    def google_callback(self, request):
        code = request.GET.get("code")

        if not code:
            return self.response_error(
                message=ERROR_MESSAGES["missing_google_exchange_code"],
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        token_response = requests.post(
            settings.GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

        if not token_response.ok:
            logger.error(
                "Google token exchange failed: status=%s response=%s",
                token_response.status_code,
                token_response.text,
            )
            return self.response_error(
                message=ERROR_MESSAGES["google_token_exchange_failed"],
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        token_data = token_response.json()
        id_token_str = token_data.get("id_token")

        if not id_token_str:
            logger.error("Google token response missing id_token: %s", token_data)
            return self.response_error(
                message=ERROR_MESSAGES["google_token_exchange_failed"],
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except Exception as exc:
            logger.error("Google id_token verification failed: %s", exc)
            return self.response_error(
                message=ERROR_MESSAGES["invalid_google_token"],
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        provider_user_id = payload.get("sub")

        user = user_services.get_or_create_user_by_social_account(
            OAuth2Providers.GOOGLE.value,
            provider_user_id,
            payload.get("given_name") or "",
            payload.get("family_name") or "",
            payload.get("picture") or None,
        )

        if not user.is_active:
            response = redirect(f"{settings.CLIENT_HOMEPAGE_URL}?error=banned")
            http.clear_auth_cookies(response)
            return response

        return oauth_services.build_oauth_login_response(user)

    @transaction.atomic()
    @action(detail=False, methods=["get"], url_path="facebook/callback")
    def facebook_callback(self, request):
        code = request.GET.get("code")

        if not code:
            return self.response_error(
                message=ERROR_MESSAGES["missing_facebook_exchange_code"],
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        token_response = requests.get(
            settings.FACEBOOK_TOKEN_URL,
            params={
                "client_id": settings.FACEBOOK_APP_ID,
                "client_secret": settings.FACEBOOK_APP_SECRET,
                "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
                "code": code,
            },
        )

        access_token = token_response.json().get("access_token")

        user_response = requests.get(
            settings.FACEBOOK_USERINFO_URL,
            params={
                "fields": "id,first_name,last_name,picture",
                "access_token": access_token,
            },
        )

        user_data = user_response.json()
        facebook_id = user_data.get("id")
        logger.info(f"--- FACEBOOK LOGIN ID: {facebook_id} ---")
        print(f"--- FACEBOOK LOGIN ID: {facebook_id} ---")

        avatar_url = (
            f"https://graph.facebook.com/{facebook_id}/picture?type=large"
            if facebook_id
            else None
        )

        user = user_services.get_or_create_user_by_social_account(
            OAuth2Providers.FACEBOOK.value,
            facebook_id,
            user_data.get("first_name") or "",
            user_data.get("last_name") or "",
            avatar_url,
        )

        if not user.is_active:
            response = redirect(f"{settings.CLIENT_HOMEPAGE_URL}?error=banned")
            http.clear_auth_cookies(response)
            return response

        return oauth_services.build_oauth_login_response(user)
