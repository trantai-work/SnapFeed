from apps.reports.constants import ReportStatus
from apps.reports.models import VideoReport


def report_video(*, reporter, video, reason: str, description: str = "") -> VideoReport:
    """
    Create or refresh a video report from a user.
    """

    report, _ = VideoReport.objects.update_or_create(
        reporter=reporter,
        video=video,
        defaults={
            "reason": reason,
            "description": description,
            "status": ReportStatus.PENDING.value,
            "handled_by": None,
            "handled_at": None,
            "moderator_note": "",
        },
    )
    return report
