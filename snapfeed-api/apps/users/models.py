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
    # Implement avatar field later (S3)

    class Meta:
        db_table = "users"

    def remove_all_groups(self):
        """
        Removes all groups associated with this user.
        """

        self.groups.clear()
