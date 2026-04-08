from rest_framework import serializers

from apps.comments.constants import MAX_COMMENT_CHARS
from apps.comments.models import VideoComment
from apps.users.serializers import UserSerializer
from apps.videos.models import Video
from core.messages import ERROR_MESSAGES


class VideoCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    video = serializers.PrimaryKeyRelatedField(
        queryset=Video.objects.all(),
        required=True,
    )

    class Meta:
        model = VideoComment
        fields = ["id", "video", "user", "content", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def validate_content(self, value: str) -> str:
        if value is None:
            return value
        if len(value) > MAX_COMMENT_CHARS:
            raise serializers.ValidationError(ERROR_MESSAGES["text_comment_too_long"])
        return value
