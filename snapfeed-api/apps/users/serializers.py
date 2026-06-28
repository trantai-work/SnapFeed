from rest_framework import serializers

from apps.permissions.constants import Groups
from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    like_count = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_moderator = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar_url",
            "like_count",
            "follower_count",
            "following_count",
            "is_following",
            "is_moderator",
            "is_admin",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar_url",
            "like_count",
            "follower_count",
            "following_count",
            "is_following",
            "is_moderator",
            "is_admin",
        ]

    def get_like_count(self, obj: User) -> int:
        """
        Total likes across all videos of this user.
        """

        # IMPORTANT: Must be annotated on queryset. No DB fallback here to avoid N+1 queries.
        return int(getattr(obj, "like_count", 0) or 0)

    def get_follower_count(self, obj: User) -> int:
        """
        Number of followers.
        """

        return int(getattr(obj, "follower_count", 0) or 0)

    def get_following_count(self, obj: User) -> int:
        """
        Number of users this user is following.
        """

        return int(getattr(obj, "following_count", 0) or 0)

    def get_is_following(self, obj: User) -> bool:
        """
        Whether the current request user is following this user.
        """

        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        if request.user.id == obj.id:
            return False
        return getattr(obj, "is_following", False)

    def get_is_moderator(self, obj: User) -> bool:
        if obj.is_superuser:
            return True
        return obj.groups.filter(name=Groups.MODERATOR.value).exists()

    def get_is_admin(self, obj: User) -> bool:
        if obj.is_superuser:
            return True
        return obj.groups.filter(name=Groups.ADMIN.value).exists()


class ModeratorUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["is_active", "date_joined"]
        read_only_fields = UserSerializer.Meta.read_only_fields + [
            "is_active",
            "date_joined",
        ]
