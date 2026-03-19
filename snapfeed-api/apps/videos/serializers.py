from rest_framework import serializers

from apps.videos.constants import AllowedVideoContentTypes
from apps.videos.models import Video
from apps.videos.services import s3_services


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

    def validate_video_key(self, value):
        """
        Check if user is the owner of the video.
        """

        user = self.context["request"].user
        s3_services.validate_s3_key_format(value, user.id)
        s3_services.check_s3_object_exists(value)

        return value


class PresignedUrlSerializer(serializers.Serializer):
    file_name = serializers.CharField()
    content_type = serializers.ChoiceField(choices=AllowedVideoContentTypes.choices())
