from django.db import models

from apps.oauth.constants import OAuth2Providers
from apps.users.models import User
from core.models import BaseModel


class SocialAccount(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="social_accounts"
    )

    provider = models.CharField(
        max_length=20,
        choices=OAuth2Providers.choices(),
    )

    provider_user_id = models.CharField(max_length=255)

    class Meta:
        db_table = "social_accounts"

        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_user_id"], name="unique_provider_user"
            )
        ]

        indexes = [models.Index(fields=["provider", "provider_user_id"])]
