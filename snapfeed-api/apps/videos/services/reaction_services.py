from django.db import transaction
from django.db.models import F
from django.db.models.functions import Greatest
from safedelete.models import HARD_DELETE

from apps.videos.models import Video, VideoReaction


def set_video_reaction(
    user, video: Video, reaction: str
) -> tuple[VideoReaction | None, int]:
    """
    Create or update the user's reaction, or remove it if the same type is sent again
    (toggle / unreact). Keeps reaction_count in sync.
    Returns (None, count) when the reaction was removed.
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
                return None, locked.reaction_count

            existing.reaction = reaction
            existing.save()
            locked.refresh_from_db(fields=["reaction_count"])
            return existing, locked.reaction_count

        VideoReaction.objects.create(user=user, video=locked, reaction=reaction)
        Video.objects.filter(pk=locked.pk).update(
            reaction_count=F("reaction_count") + 1
        )
        locked.refresh_from_db(fields=["reaction_count"])
        row = VideoReaction.objects.get(user=user, video_id=locked.pk)
        return row, locked.reaction_count
