from __future__ import annotations

from django.db import transaction
from django.db.models import F

from apps.comments.models import VideoComment
from apps.notifications.services import notification_services
from apps.videos.models import Video


def create_video_comment(*, user, video: Video, content: str) -> VideoComment:
    with transaction.atomic():
        locked = Video.objects.select_for_update().get(pk=video.pk)
        comment = VideoComment.objects.create(user=user, video=locked, content=content)
        Video.objects.filter(pk=locked.pk).update(comment_count=F("comment_count") + 1)

    notification_services.notify_video_comment(actor=user, comment=comment)
    return comment
