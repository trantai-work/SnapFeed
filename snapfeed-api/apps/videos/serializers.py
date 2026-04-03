from rest_framework import serializers

from apps.videos.constants import AllowedVideoContentTypes
from apps.videos.models import Video


class VideoSerializer(serializers.ModelSerializer):
    user_avatar = serializers.CharField(source="user.avatar_url", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = Video
        fields = [
            "id",
            "user",
            "user_avatar",
            "user_first_name",
            "user_last_name",
            "description",
            "video_key",
            "thumbnail",
            "duration",
            "view_count",
            "comment_count",
            "reaction_count",
        ]
        read_only_fields = [
            "id",
            "user",
            "view_count",
            "comment_count",
            "reaction_count",
        ]


class PresignedUrlSerializer(serializers.Serializer):
    file_name = serializers.CharField()
    content_type = serializers.ChoiceField(choices=AllowedVideoContentTypes.choices())
