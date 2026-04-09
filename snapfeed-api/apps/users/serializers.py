from rest_framework import serializers

from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    like_count = serializers.SerializerMethodField()

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
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "avatar_url",
            "like_count",
        ]

    def get_like_count(self, obj: User) -> int:
        """
        Total likes across all videos of this user.
        """

        # IMPORTANT: Must be annotated on queryset. No DB fallback here to avoid N+1 queries.
        return int(getattr(obj, "like_count", 0) or 0)
