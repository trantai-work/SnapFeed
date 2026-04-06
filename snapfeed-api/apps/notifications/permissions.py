from rest_framework import permissions


class ChangeNotificationRecipientPermission(permissions.BasePermission):
    """
    Permission class to check if a user has permission to change notification recipient.
    """

    def has_permission(self, request, view):
        user = request.user
        return user.has_perm("notifications.change_notificationrecipient")
