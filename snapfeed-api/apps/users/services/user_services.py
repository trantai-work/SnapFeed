from typing import Optional

from apps.users.models import User


def find_user_by_email(email: str) -> Optional[User]:
    return User.objects.filter(email=email).first()


def create_user(
    username: str,
    password: Optional[str],
    email: Optional[str],
    first_name: Optional[str],
    last_name: Optional[str],
) -> User:

    user = User(
        username=username,
        email=email or "",
        first_name=first_name or "",
        last_name=last_name or "",
    )

    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()

    user.save()

    return user
