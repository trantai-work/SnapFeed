from rest_framework import permissions


class GeneratePresignedUrlPermission(permissions.BasePermission):
    """
    Permission class to check if a user has permission to generate presigned url of a video.
    """

    def has_permission(self, request, view):
        user = request.user
        return user.has_perm("videos.generate_presigned_url")


class ReactVideoPermissions(permissions.BasePermission):
    """
    Permission class to check if a user has permission to react to a video.
    """

    def has_permission(self, request, view):
        user = request.user
        return user.has_perm("videos.react_video")
