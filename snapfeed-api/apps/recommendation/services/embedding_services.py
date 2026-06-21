from __future__ import annotations

import logging

import numpy as np

from apps.recommendation.constants import REACTION_EMBEDDING_MULTIPLIERS
from apps.recommendation.models import UserEmbedding
from apps.users.models import User
from apps.videos.models import Video, VideoReaction, VideoView

logger = logging.getLogger(__name__)


def _get_reaction_multiplier(user: User, video: Video) -> float:
    reaction = (
        VideoReaction.objects.filter(user=user, video=video)
        .values_list("reaction", flat=True)
        .first()
    )
    if reaction is None:
        return 1.0

    try:
        return REACTION_EMBEDDING_MULTIPLIERS[reaction]
    except KeyError as exc:
        logger.warning(
            "Unknown reaction type found for user embedding: reaction=%r user_id=%s video_id=%s. Defaulting to 1.0",
            reaction,
            user.pk,
            video.pk,
        )
        return 1.0


def _compute_watch_ratio(watch_time: int, duration: int) -> float:
    if not duration or duration <= 0:
        return 0.0
    return min(watch_time / duration, 1.0)


def update_user_embedding(user: User, video: Video) -> None:
    """
    Incrementally update the user's embedding after viewing or reacting to a video.

    Uses accumulated_weight to preserve the magnitude of previous contributions:
        new_raw = accumulated_weight * old_embedding + weight * video_embedding
        new_embedding = normalize(new_raw)
        new_accumulated_weight = ||new_raw||

    Skips if the video model has no embedding relation.
    """
    if not hasattr(video, "embedding"):
        logger.debug(
            "Video pk=%s has no embedding relation, skipping user embedding update",
            video.pk,
        )
        return

    video_embedding_obj = video.embedding

    view = VideoView.objects.filter(user=user, video=video).first()
    if not view:
        logger.debug(
            "No VideoView record found for user pk=%s video pk=%s, skipping user embedding update",
            user.pk,
            video.pk,
        )
        return

    has_reaction = VideoReaction.objects.filter(user=user, video=video).exists()
    from apps.videos.services.view_services import is_valid_view

    is_valid = is_valid_view(view.watch_time, video.duration) or has_reaction

    if not is_valid:
        logger.debug(
            "View is not valid and user has no reaction (watch_time=%s duration=%s) user pk=%s video pk=%s, skipping user embedding update",
            view.watch_time,
            video.duration,
            user.pk,
            video.pk,
        )
        return

    if has_reaction:
        watch_ratio = 1.0
    else:
        watch_ratio = _compute_watch_ratio(view.watch_time, video.duration)

    reaction_multiplier = _get_reaction_multiplier(user, video)
    weight = watch_ratio * reaction_multiplier

    video_emb = np.array(video_embedding_obj.embedding, dtype=np.float64)

    user_emb_obj = UserEmbedding.objects.filter(user=user).first()

    if user_emb_obj is None:
        # First video — initialize directly
        raw = weight * video_emb
    else:
        old_emb = np.array(user_emb_obj.embedding, dtype=np.float64)
        acc_weight = user_emb_obj.accumulated_weight
        raw = acc_weight * old_emb + weight * video_emb

    norm = np.linalg.norm(raw)
    if norm <= 0:
        logger.debug(
            "Zero embedding norm user pk=%s video pk=%s, skipping user embedding update",
            user.pk,
            video.pk,
        )
        return

    new_embedding = (raw / norm).tolist()
    new_accumulated_weight = float(norm)

    UserEmbedding.objects.update_or_create(
        user=user,
        defaults={
            "embedding": new_embedding,
            "accumulated_weight": new_accumulated_weight,
        },
    )
    logger.info(
        "Updated user embedding for user pk=%s (video pk=%s, weight=%.4f)",
        user.pk,
        video.pk,
        weight,
    )
