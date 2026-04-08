import django_filters

from apps.comments.models import VideoComment


class VideoCommentFilter(django_filters.FilterSet):
    video_id = django_filters.NumberFilter(
        field_name="video_id", min_value=1, required=True
    )

    class Meta:
        model = VideoComment
        fields = ["video_id"]
