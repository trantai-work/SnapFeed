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
    try:
        return REACTION_EMBEDDING_MULTIPLIERS[reaction]
    except KeyError as exc:
        raise ValueError(
            f"Unknown or missing reaction for user embedding: reaction={reaction!r} "
            f"user_id={user.pk} video_id={video.pk}"
        ) from exc


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
    if view is None:
        logger.debug(
            "No VideoView for user pk=%s video pk=%s, skipping user embedding update",
            user.pk,
            video.pk,
        )
        return

    watch_ratio = _compute_watch_ratio(view.watch_time, video.duration)
    if watch_ratio <= 0:
        logger.debug(
            "watch_ratio=%s (watch_time=%s duration=%s) user pk=%s video pk=%s, skipping user embedding update",
            watch_ratio,
            view.watch_time,
            video.duration,
            user.pk,
            video.pk,
        )
        return

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
