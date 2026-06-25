from typing import Optional, List

from django.contrib.auth.models import Group

from apps.oauth.services import social_account_services
from apps.permissions.constants import Groups
from apps.users.constants import USER_SEARCH_DEFAULT_SIZE
from apps.users.models import User
from utils import random
from typing import Tuple
from django.db.models import QuerySet, Case, IntegerField, Value, When

from apps.users.documents import UserDocument
from django.db import transaction
from safedelete import HARD_DELETE
from apps.recommendation.models import UserEmbedding
from apps.videos.models import VideoView
from utils.search_cursor import decode_search_after_cursor, encode_search_after_cursor


def find_user_by_email(email: str) -> Optional[User]:
    return User.objects.filter(email=email).first()


def create_user(
    username: str,
    password: Optional[str],
    email: Optional[str],
    first_name: str,
    last_name: str,
    avatar_url: Optional[str] = None,
    group_names: Optional[List[str]] = None,
) -> User:
    """
    Create a new user and assign to existing groups.
    Default group is MEMBER if group_names is None.
    Groups that do not exist are ignored.
    """

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

    if group_names is None:
        group_names = [Groups.MEMBER.value]

    existing_groups = Group.objects.filter(name__in=group_names)
    user.groups.add(*existing_groups)

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


def search_users(
    *,
    keyword: str,
    base_qs: QuerySet[User],
    size: int = USER_SEARCH_DEFAULT_SIZE,
    cursor: str | None = None,
) -> Tuple[QuerySet[User], str | None]:
    """
    Search users via Elasticsearch (username, first_name, last_name) using `search_after`.

    Returns:
      (queryset, next_cursor)
    """

    s = (
        UserDocument.search()
        .query(
            "multi_match",
            query=keyword,
            fields=["username^3", "first_name^2", "last_name^2"],
            type="phrase_prefix",
        )
        # Stable sort + tie-breaker for search_after.
        .sort({"_score": "desc"}, {"id": "desc"})
        .extra(size=size)
    )

    if cursor:
        s = s.extra(search_after=decode_search_after_cursor(cursor))

    resp = s.execute()

    hits = resp.hits
    ids = [int(hit.meta.id) for hit in hits]

    if not ids:
        return base_qs.none(), None

    order = Case(
        *[When(pk=pk, then=Value(idx)) for idx, pk in enumerate(ids)],
        output_field=IntegerField(),
    )
    qs = base_qs.filter(pk__in=ids).order_by(order)

    next_cursor = None
    last_hit = hits[-1] if hits else None
    if last_hit is not None and hasattr(last_hit.meta, "sort"):
        sort_values = getattr(last_hit.meta, "sort", None)
        if isinstance(sort_values, (list, tuple)):
            next_cursor = encode_search_after_cursor(list(sort_values))

    return qs, next_cursor


def reset_user_recommendations(user: User) -> None:
    """
    Reset user embedding and delete all of their video views to reset recommendation feeds.
    """
    with transaction.atomic():
        UserEmbedding.all_objects.filter(user=user).delete(force_policy=HARD_DELETE)
        VideoView.all_objects.filter(user=user).delete(force_policy=HARD_DELETE)
