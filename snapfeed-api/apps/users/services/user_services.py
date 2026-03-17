from typing import Optional

from apps.oauth.services import social_account_services
from apps.users.models import User
from utils import random


def find_user_by_email(email: str) -> Optional[User]:
    return User.objects.filter(email=email).first()


def create_user(
    username: str,
    password: Optional[str],
    email: Optional[str],
    first_name: str,
    last_name: str,
    avatar_url: Optional[str] = None,
) -> User:

    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
    )

    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()

    user.save()

    return user


def get_or_create_user_by_social_account(
    provider: str,
    provider_user_id: str,
    first_name: str = "",
    last_name: str = "",
    avatar_url: Optional[str] = None,
) -> User:
    """
    Return the user linked to the given social account,
    or create a new user and link the social account if it does not exist.
    """

    social_account = social_account_services.get_social_account(
        provider,
        provider_user_id,
    )

    if social_account:
        return social_account.user

    user = create_user(
        username=random.generate_username(),
        password=None,
        email=None,
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
    )

    social_account_services.create_social_account(
        user,
        provider,
        provider_user_id,
    )

    return user
