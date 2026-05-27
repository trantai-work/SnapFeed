from django.db import models

from apps.reports.constants import ReportStatus, VideoReportReason
from apps.users.models import User
from apps.videos.models import Video
from core.models import BaseModel


class VideoReport(BaseModel):
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="video_reports",
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reason = models.CharField(
        max_length=32,
        choices=VideoReportReason.choices(),
        default=VideoReportReason.OTHER.value,
    )
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices(),
        default=ReportStatus.PENDING.value,
        db_index=True,
    )
    handled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_video_reports",
    )
    handled_at = models.DateTimeField(null=True, blank=True)
    moderator_note = models.TextField(blank=True, default="")

    class Meta:
        db_table = "video_reports"
        constraints = [
            models.UniqueConstraint(
                fields=["reporter", "video"],
                name="unique_reporter_video_report",
            )
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["video", "status"]),
            models.Index(fields=["reporter", "-created_at"]),
        ]
        permissions = [
            ("moderate_videoreport", "Can moderate video reports"),
        ]
