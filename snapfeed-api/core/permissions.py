from django.contrib.auth.backends import ModelBackend
from rest_framework.permissions import BasePermission, DjangoModelPermissions


class FullDjangoModelPermissions(DjangoModelPermissions):
    """
    Extended version of DjangoModelPermissions that also enforces `view_` permissions.
    """

    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }


class ExcludePermissionModelBackend(ModelBackend):
    """
    Custom ModelBackend class for exclude permission case.
    """

    def get_all_permissions(self, user_obj, obj=None):
        """
        Remove exclude permissions out of original all permissions.
        """

        all_perms = super().get_all_permissions(user_obj, obj)

        excluded_perms = {
            f"{app_label}.{codename}"
            for app_label, codename in user_obj.exclude_permissions.values_list(
                "content_type__app_label", "codename"
            )
        }

        return all_perms - excluded_perms


class IsUserAuthenticated(BasePermission):
    """
    Permission class that checks if user is authenticated.
    """

    def has_permission(self, request, view):
        """
        Check if user is authenticated.
        """

        return request.user.is_authenticated
