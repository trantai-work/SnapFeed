from typing import Optional

from apps.oauth.models import SocialAccount
from apps.users.models import User


def get_social_account(provider: str, provider_user_id: str) -> Optional[SocialAccount]:
    """
    Get SocialAccount by provider and provider_user_id.
    """

    return SocialAccount.objects.filter(
        provider=provider, provider_user_id=provider_user_id
    ).first()


def create_social_account(
    user: User, provider: str, provider_user_id: str
) -> SocialAccount:
    """
    Create new SocialAccount.
    """

    return SocialAccount.objects.create(
        user=user, provider=provider, provider_user_id=provider_user_id
    )
