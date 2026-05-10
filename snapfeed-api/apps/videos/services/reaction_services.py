from django.db import transaction
from django.db.models import F
from django.db.models.functions import Greatest
from safedelete.models import HARD_DELETE

from apps.recommendation.services.embedding_services import update_user_embedding
from apps.videos.constants import REACT_VIDEO_DEFAULT_LABEL, REACT_VIDEO_LABELS_MAP
from apps.videos.models import Video, VideoReaction


def react_video_notification_label(reaction: str | None) -> str:
    """
    Resolve emoji (or fallback) for a video reaction type (e.g. notification body).
    """

    if not reaction:
        return REACT_VIDEO_DEFAULT_LABEL
    return REACT_VIDEO_LABELS_MAP.get(reaction, REACT_VIDEO_DEFAULT_LABEL)


def set_video_reaction(
    user, video: Video, reaction: str
) -> tuple[VideoReaction | None, int, bool]:
    """
    Create or update the user's reaction, or remove it if the same type is sent again
    (toggle / unreact). Keeps reaction_count in sync.

    Returns (None, count, False) when the reaction was removed.
    Returns (row, count, False) when the reaction type was changed.
    Returns (row, count, True) when a new reaction row was created.
    """

    with transaction.atomic():
        locked = Video.objects.select_for_update().get(pk=video.pk)
        existing = VideoReaction.objects.filter(user=user, video_id=locked.pk).first()

        if existing:
            if existing.reaction == reaction:
                existing.delete(force_policy=HARD_DELETE)
                Video.objects.filter(pk=locked.pk).update(
                    reaction_count=Greatest(F("reaction_count") - 1, 0)
                )
                locked.refresh_from_db(fields=["reaction_count"])
                result = None, locked.reaction_count, False
            else:
                existing.reaction = reaction
                existing.save()
                locked.refresh_from_db(fields=["reaction_count"])
                result = existing, locked.reaction_count, False
        else:
            VideoReaction.objects.create(user=user, video=locked, reaction=reaction)
            Video.objects.filter(pk=locked.pk).update(
                reaction_count=F("reaction_count") + 1
            )
            locked.refresh_from_db(fields=["reaction_count"])
            row = VideoReaction.objects.get(user=user, video_id=locked.pk)
            result = row, locked.reaction_count, True

    update_user_embedding(user=user, video=video)

    return result
