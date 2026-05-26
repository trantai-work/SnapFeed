from drf_spectacular.utils import extend_schema
from django.utils import timezone
from rest_framework import mixins

from apps.notifications.services.notification_services import notify_system

from apps.reports.constants import (
    ReportStatus,
    VIDEO_HIDDEN_NOTIFICATION_TITLE,
    VIDEO_RESTORED_NOTIFICATION_TITLE,
)
from apps.reports.models import VideoReport
from apps.reports.permissions import IsModerator
from apps.reports.serializers import VideoReportSerializer
from apps.reports.services.stats_services import get_system_stats_data
from apps.reports.services.report_realtime_services import push_video_report_updated
from core.apis import BaseAPIViewSet
from core.messages import SUCCESS_MESSAGES


@extend_schema(tags=["video-reports"])
class VideoReportViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    BaseAPIViewSet,
):
    serializer_class = VideoReportSerializer
    permission_classes = [IsModerator]
    queryset = VideoReport.all_objects.select_related(
        "video",
        "video__user",
        "reporter",
        "handled_by",
    ).order_by("-created_at", "-id")

    def perform_update(self, serializer):
        report = serializer.save(
            handled_by=self.request.user,
            handled_at=timezone.now(),
        )

        # If Moderator selects "Hide Video" (ACTION_TAKEN), soft-delete the video
        if report.status == ReportStatus.ACTION_TAKEN.value and report.video_id:
            was_deleted = getattr(report.video, "deleted", None) is not None
            report.video.delete()

            # Send notification if it wasn't already deleted
            if not was_deleted and report.video.user_id:
                notify_system(
                    title=VIDEO_HIDDEN_NOTIFICATION_TITLE,
                    message=SUCCESS_MESSAGES["video_hidden"].format(
                        video_id=report.video.id
                    ),
                    recipient_users=[report.video.user],
                    target=report.video,
                )
        elif report.status == ReportStatus.DISMISSED.value and report.video_id:
            if getattr(report.video, "deleted", None):
                report.video.undelete()

                # Send notification that video was restored
                if report.video.user_id:
                    notify_system(
                        title=VIDEO_RESTORED_NOTIFICATION_TITLE,
                        message=SUCCESS_MESSAGES["video_restored"].format(
                            video_id=report.video.id
                        ),
                        recipient_users=[report.video.user],
                        target=report.video,
                    )

        push_video_report_updated(report)


@extend_schema(tags=["system-stats"])
class SystemStatsViewSet(BaseAPIViewSet):
    permission_classes = [IsModerator]

    def list(self, request):
        time_range = request.query_params.get("time_range", "week")
        data = get_system_stats_data(time_range)
        return self.response_ok(data=data)


from apps.videos.models import Video
from apps.videos.serializers import VideoSerializer


@extend_schema(tags=["moderator-videos"])
class ModeratorVideoViewSet(
    mixins.RetrieveModelMixin,
    BaseAPIViewSet,
):
    """
    Dedicated API for Moderators to get video details.
    Uses all_objects to allow retrieving soft-deleted videos.
    """

    serializer_class = VideoSerializer
    permission_classes = [IsModerator]
    queryset = Video.all_objects.select_related("user").prefetch_related("tags").all()


from apps.comments.models import VideoComment
from apps.comments.serializers import VideoCommentSerializer
from apps.comments.filters import VideoCommentFilter
from apps.comments.pagination import VideoCommentPagination


@extend_schema(tags=["moderator-comments"])
class ModeratorVideoCommentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    BaseAPIViewSet,
):
    """
    Dedicated API for Moderators to get video comments.
    Uses all_objects to allow retrieving comments of soft-deleted videos.
    """

    serializer_class = VideoCommentSerializer
    permission_classes = [IsModerator]
    pagination_class = VideoCommentPagination
    filterset_class = VideoCommentFilter
    queryset = (
        VideoComment.all_objects.select_related("user", "video")
        .order_by("-created_at", "-id")
        .all()
    )
