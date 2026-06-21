from django.db import transaction
from django.db.models import F

from apps.recommendation.services.embedding_services import update_user_embedding
from apps.videos.models import Video, VideoView, VideoReaction

MIN_WATCH_TIME = 5  # seconds — for videos longer than this threshold
SHORT_VIDEO_THRESHOLD = 5  # videos <= this duration use ratio-only check
SHORT_VIDEO_MIN_RATIO = 0.5  # must watch 50% of short videos
LONG_VIDEO_MIN_RATIO = 0.1  # must watch 10% of longer videos


def is_valid_view(watch_time: int, duration: int) -> bool:
    """
    Return True if the watch_time qualifies as a real view.

    - Short videos (duration <= 5s): must watch >= 50% of the video
    - Longer videos: must watch >= 5s AND >= 10% of the video
    """
    if duration <= 0:
        return False

    watch_ratio = watch_time / duration

    if duration <= SHORT_VIDEO_THRESHOLD:
        return watch_ratio >= SHORT_VIDEO_MIN_RATIO

    return watch_time >= MIN_WATCH_TIME and watch_ratio >= LONG_VIDEO_MIN_RATIO


def record_video_view(*, user, video: Video, watch_time: int) -> VideoView | None:
    """
    Upsert a VideoView for the given user and video.
    Always creates a VideoView record to exclude it from future feeds,
    but only increments view_count if it qualifies as a valid view.
    """

    with transaction.atomic():
        locked = Video.objects.select_for_update().get(pk=video.pk)

        view, created = VideoView.objects.get_or_create(
            user=user,
            video=locked,
            defaults={"watch_time": watch_time},
        )

        has_reaction = VideoReaction.objects.filter(user=user, video=locked).exists()
        is_valid = is_valid_view(watch_time, locked.duration) or has_reaction

        if created:
            if is_valid:
                Video.objects.filter(pk=locked.pk).update(
                    view_count=F("view_count") + 1
                )
        else:
            was_previously_valid = (
                is_valid_view(view.watch_time, locked.duration) or has_reaction
            )

            if watch_time > view.watch_time:
                view.watch_time = watch_time
                view.save(update_fields=["watch_time", "updated_at"])

            is_now_valid = (
                is_valid_view(view.watch_time, locked.duration) or has_reaction
            )
            if is_now_valid and not was_previously_valid:
                Video.objects.filter(pk=locked.pk).update(
                    view_count=F("view_count") + 1
                )

    update_user_embedding(user=user, video=video)

    return view
