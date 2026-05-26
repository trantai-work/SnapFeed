from __future__ import annotations
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from djangorestframework_camel_case.util import camelize
from apps.reports.models import VideoReport
from apps.reports.serializers import VideoReportSerializer
from utils.json import jsonable

logger = logging.getLogger(__name__)


def push_video_report_created(report: VideoReport) -> None:
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning(
                "Channel layer is not configured or offline. Skipping video_report.created push."
            )
            return

        # Fetch fully populated report object
        full_report = VideoReport.all_objects.select_related(
            "video",
            "video__user",
            "reporter",
            "handled_by",
        ).get(id=report.id)

        raw_report = VideoReportSerializer(full_report).data
        report_payload = camelize({"report": jsonable(raw_report)})

        event_data = {"type": "video_report_created", "payload": report_payload}

        # Send to support moderators group
        async_to_sync(channel_layer.group_send)("support_moderators", event_data)
    except Exception as e:
        logger.exception(
            f"Failed to push video_report.created realtime event: {e}",
            extra={"report_id": getattr(report, "id", None)},
        )


def push_video_report_updated(report: VideoReport) -> None:
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning(
                "Channel layer is not configured or offline. Skipping video_report.updated push."
            )
            return

        # Fetch fully populated report object
        full_report = VideoReport.all_objects.select_related(
            "video",
            "video__user",
            "reporter",
            "handled_by",
        ).get(id=report.id)

        raw_report = VideoReportSerializer(full_report).data
        report_payload = camelize({"report": jsonable(raw_report)})

        event_data = {"type": "video_report_updated", "payload": report_payload}

        # Send to support moderators group
        async_to_sync(channel_layer.group_send)("support_moderators", event_data)
    except Exception as e:
        logger.exception(
            f"Failed to push video_report.updated realtime event: {e}",
            extra={"report_id": getattr(report, "id", None)},
        )
