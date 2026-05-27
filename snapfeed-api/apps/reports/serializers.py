from rest_framework import serializers

from apps.reports.constants import VideoReportReason
from apps.reports.models import VideoReport


class VideoReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=VideoReportReason.choices())
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        default="",
    )


class VideoReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(
        source="reporter.username", read_only=True
    )
    reporter_first_name = serializers.CharField(
        source="reporter.first_name", read_only=True
    )
    reporter_last_name = serializers.CharField(
        source="reporter.last_name", read_only=True
    )
    reporter_avatar_url = serializers.CharField(
        source="reporter.avatar_url", read_only=True
    )
    handled_by_username = serializers.CharField(
        source="handled_by.username", read_only=True
    )
    handled_by_avatar_url = serializers.CharField(
        source="handled_by.avatar_url", read_only=True
    )

    video_title = serializers.CharField(source="video.title", read_only=True)
    video_user = serializers.IntegerField(source="video.user_id", read_only=True)

    class Meta:
        model = VideoReport
        fields = [
            "id",
            "video",
            "video_title",
            "video_user",
            "reporter",
            "reporter_username",
            "reporter_first_name",
            "reporter_last_name",
            "reporter_avatar_url",
            "reason",
            "description",
            "status",
            "moderator_note",
            "handled_by",
            "handled_by_username",
            "handled_by_avatar_url",
            "handled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "video",
            "video_title",
            "video_user",
            "reporter",
            "reporter_username",
            "reporter_first_name",
            "reporter_last_name",
            "reporter_avatar_url",
            "reason",
            "description",
            "handled_by",
            "handled_by_username",
            "handled_by_avatar_url",
            "handled_at",
            "created_at",
            "updated_at",
        ]
