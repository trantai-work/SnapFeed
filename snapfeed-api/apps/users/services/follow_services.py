from __future__ import annotations

from safedelete import HARD_DELETE

from apps.users.exceptions import CannotFollowYourselfError, HaveNotFollowUserError
from apps.users.models import User, UserFollow
from django.db.models import Q
from apps.notifications.services import notification_services


def follow_user(follower: User, following: User) -> UserFollow:
    """
    Follow a user. Returns the UserFollow instance.
    Raises ValueError if trying to follow self.
    """

    if follower.id == following.id:
        raise CannotFollowYourselfError()

    follow, created = UserFollow.objects.get_or_create(
        follower=follower,
        following=following,
    )

    # Create notification for new follower
    if created:
        notification_services.create_follow_notification(
            follower=follower,
            following=following,
        )

    return follow


def unfollow_user(follower: User, following: User) -> None:
    """
    Unfollow a user.
    Raises HaveNotFollowUserError if not following.
    """
    deleted_count, _ = UserFollow.objects.filter(
        follower=follower,
        following=following,
    ).delete(force_policy=HARD_DELETE)

    print(follower.id, following.id, deleted_count)

    if deleted_count == 0:
        raise HaveNotFollowUserError()


def is_following(follower: User, following: User) -> bool:
    """
    Check if follower is following the user.
    """
    return UserFollow.objects.filter(
        follower=follower,
        following=following,
    ).exists()


def get_follower_count(user: User) -> int:
    """
    Get the number of followers for a user.
    """
    return UserFollow.objects.filter(following=user).count()


def get_following_count(user: User) -> int:
    """
    Get the number of users that this user is following.
    """
    return UserFollow.objects.filter(follower=user).count()


def filter_users_by_search(qs, search_query: str):
    """
    Filter users queryset by search query.
    Search in username, first_name, and last_name.
    """

    if not search_query or not search_query.strip():
        return qs

    search_query = search_query.strip()
    return qs.filter(
        Q(username__icontains=search_query)
        | Q(first_name__icontains=search_query)
        | Q(last_name__icontains=search_query)
    )
