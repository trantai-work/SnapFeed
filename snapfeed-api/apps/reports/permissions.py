from rest_framework.permissions import BasePermission

from apps.permissions.constants import Groups


class IsModerator(BasePermission):
    """
    Allow users in admin/moderator groups, or Django superusers.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(
            name__in=[Groups.ADMIN.value, Groups.MODERATOR.value]
        ).exists()
