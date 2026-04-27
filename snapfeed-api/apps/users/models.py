from django.contrib.auth.models import AbstractUser, UserManager
from safedelete.managers import SafeDeleteManager
from django.db import models

from core.models import BaseModel
from django.contrib.auth.models import Permission


class SoftDeleteUserManager(UserManager, SafeDeleteManager):
    """
    Custom user manager that filters out soft-deleted users.
    """

    def get_queryset(self):
        """
        Returns a queryset excluding users with a non-null deleted_at field.
        """

        qs = SafeDeleteManager.get_queryset(self)
        return qs.filter(deleted__isnull=True)


class User(AbstractUser, BaseModel):
    """
    Custom user model extending Django's AbstractUser and BaseModel.
    """

    email = models.EmailField(
        unique=True,
        null=True,
        blank=False,
    )
    exclude_permissions = models.ManyToManyField(
        Permission, db_table="user_exclude_permissions", related_name="exclude_users"
    )
    objects = SoftDeleteUserManager()
    all_objects = UserManager()
    avatar_url = models.URLField(blank=False, null=True, max_length=1000)

    class Meta:
        db_table = "users"

    def remove_all_groups(self):
        """
        Removes all groups associated with this user.
        """

        self.groups.clear()


class UserFollow(BaseModel):
    """
    User follow relationship.

    - follower: user who follows
    - following: user being followed
    """

    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="following",  # user.following.all()
    )
    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="followers",  # user.followers.all()
    )

    class Meta:
        db_table = "user_follows"
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="unique_follower_following",
            ),
            models.CheckConstraint(
                condition=~models.Q(follower=models.F("following")),
                name="prevent_self_follow",
            ),
        ]
        indexes = [
            models.Index(fields=["follower"]),
            models.Index(fields=["following"]),
            models.Index(fields=["follower", "-created_at"]),
            models.Index(fields=["following", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.follower_id} -> {self.following_id}"
