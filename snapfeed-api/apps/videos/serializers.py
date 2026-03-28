from rest_framework import serializers

from apps.videos.constants import AllowedVideoContentTypes
from apps.videos.models import Video


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = [
            "id",
            "user",
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
