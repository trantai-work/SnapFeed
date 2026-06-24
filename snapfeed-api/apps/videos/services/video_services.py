from __future__ import annotations

import logging
from typing import Optional, Tuple

from django.contrib.contenttypes.models import ContentType
from django.db.models import (
    Case,
    ExpressionWrapper,
    F,
    FloatField,
    IntegerField,
    OuterRef,
    QuerySet,
    Subquery,
    Sum,
    Count,
    Value,
    When,
)
from django.db.models.functions import Coalesce, Extract, Now, Random
from pgvector.django import CosineDistance
from safedelete.models import HARD_DELETE

from apps.notifications.models import Notification
from apps.recommendation.models import VideoEmbedding
from apps.users.models import User
from apps.videos.constants import VIDEO_SEARCH_DEFAULT_SIZE
from apps.videos.documents import VideoDocument
from apps.videos.exceptions import VideoWithS3KeyNotFound
from apps.videos.models import Video, VideoView
from django.utils.timezone import now
from apps.videos.services.s3_services import delete_s3_object, delete_s3_directory
from utils.search_cursor import decode_search_after_cursor, encode_search_after_cursor

logger = logging.getLogger(__name__)


def get_video_by_s3_key(video_s3_key: str) -> Video:
    """
    Get Video by S3 Key.
    """

    try:
        return Video.objects.get(video_key=video_s3_key)
    except Video.DoesNotExist:
        raise VideoWithS3KeyNotFound(s3_key=video_s3_key)


def get_seen_video(user: User) -> QuerySet[Video]:
    """
    Get seen videos by user.
    """

    return Video.objects.filter(video_views__user=user).distinct()


def get_following_videos(user: User) -> QuerySet[Video]:
    """
    Get latest videos from users that the given user follows.
    """

    return (
        Video.objects.filter(user__followers__follower=user)
        .select_related("user")
        .prefetch_related("tags")
        .order_by("-created_at", "-id")
    )


def get_trending_videos(limit: int = 25) -> QuerySet[Video]:
    """
    Get trending videos based on custom score.
    """

    qs = (
        Video.objects.annotate(
            total_watch_time=Coalesce(Sum("video_views__watch_time"), 0),
            total_reactions=Count("reactions"),
            age_in_hours=ExpressionWrapper(
                (Extract(Now() - F("created_at"), "epoch") / 3600.0),
                output_field=FloatField(),
            ),
        )
        .annotate(
            trending_score=ExpressionWrapper(
                (
                    F("total_watch_time") * 0.5
                    + F("total_reactions") * 0.3
                    + F("view_count") * 0.2
                )
                / (F("age_in_hours") + 2) ** 1.5,
                output_field=FloatField(),
            )
        )
        .order_by(F("trending_score").desc(nulls_last=True), "-created_at", "-id")
    )
    return qs[:limit]


def get_similar_videos(
    user_embedding: list[float],
    exclude_video_ids: Optional[QuerySet] = None,
    limit: int = 50,
) -> QuerySet[Video]:
    """
    Return videos similar to user's embedding, excluding already seen videos.
    """

    subquery = (
        VideoEmbedding.objects.filter(video_id=OuterRef("pk"))
        .annotate(distance=CosineDistance("embedding", user_embedding))
        .values("distance")[:1]
    )

    queryset = Video.objects.annotate(distance=Subquery(subquery))
    if exclude_video_ids:
        queryset = queryset.exclude(id__in=exclude_video_ids)

    return queryset.order_by("distance")[:limit]


def get_default_feeds() -> QuerySet[Video]:
    """
    Get default feed for user.
    """

    trending_pool_ids = list(
        get_trending_videos(limit=100).values_list("id", flat=True)
    )
    feeds = Video.objects.filter(id__in=trending_pool_ids).order_by(Random())[:25]

    return feeds


def calculate_video_scores(
    video: Video, distance: float | None, current_time
) -> tuple[float, float, float, float]:
    """
    Calculates similarity, engagement, recency and total score for a video.
    Returns: (total_score, similarity_score, engagement_score, recency_score)
    """
    # 1. Similarity score: 1.0 - CosineDistance if similarity search distance is present, else 0.0
    if distance is not None:
        s_sim = max(0.0, min(1.0, 1.0 - distance))
    else:
        s_sim = 0.0

    # 2. Engagement score: eng_raw / (eng_raw + 100.0)
    total_watch_time = getattr(video, "total_watch_time", 0) or 0
    view_count = video.view_count or 0
    reaction_count = video.reaction_count or 0

    eng_raw = reaction_count * 3 + total_watch_time * 0.5 + view_count * 0.2
    s_eng = eng_raw / (eng_raw + 100.0) if eng_raw > 0 else 0.0

    # 3. Recency score: 24.0 / (age_in_hours + 24.0)
    age_in_hours = (current_time - video.created_at).total_seconds() / 3600.0
    s_rec = 24.0 / (age_in_hours + 24.0) if age_in_hours >= 0 else 1.0

    # Weighted score: 0.5 * Similarity + 0.3 * Engagement + 0.2 * Recency
    score = 0.5 * s_sim + 0.3 * s_eng + 0.2 * s_rec
    return score, s_sim, s_eng, s_rec


def rerank_videos_by_scores(
    candidates_qs: QuerySet[Video], limit: int = 30
) -> list[tuple[int, float, float, float, float]]:
    """
    Reranks candidate videos in memory based on a combined score:
      Score = 0.5 * Similarity + 0.3 * Engagement + 0.2 * Recency

    Returns a list of tuples: (video_id, total_score, similarity_score, engagement_score, recency_score)
    sorted by score descending.
    """
    watch_time_subquery = (
        VideoView.objects.filter(video_id=OuterRef("pk"))
        .values("video_id")
        .annotate(total=Sum("watch_time"))
        .values("total")[:1]
    )

    candidates = list(
        candidates_qs.annotate(
            total_watch_time=Coalesce(Subquery(watch_time_subquery), 0)
        )
    )

    current_time = now()
    scored_candidates = []

    for video in candidates:
        distance = getattr(video, "distance", None)
        score, s_sim, s_eng, s_rec = calculate_video_scores(
            video, distance, current_time
        )
        scored_candidates.append((video.id, score, s_sim, s_eng, s_rec))

    scored_candidates.sort(key=lambda x: x[1], reverse=True)
    return scored_candidates[:limit]


def get_personalized_feeds(user: User) -> tuple[QuerySet[Video], dict[int, dict]]:
    """
    Get personalized feeds for a logged-in user.
    Mixes similar videos (based on embedding, reranked by engagement & recency) and trending videos.
    """

    if not hasattr(user, "embedding"):
        return get_default_feeds(), {}

    seen_video_ids = get_seen_video(user).values_list("id", flat=True)
    user_embedding = user.embedding.embedding

    # 1. Retrieve 100 similar candidate videos based on embedding similarity
    similar_qs = get_similar_videos(user_embedding, seen_video_ids, limit=100)
    similar_ids = list(similar_qs.values_list("id", flat=True))

    if not similar_ids:
        candidates_qs = Video.objects.none()
    else:
        subquery = (
            VideoEmbedding.objects.filter(video_id=OuterRef("pk"))
            .annotate(distance=CosineDistance("embedding", user_embedding))
            .values("distance")[:1]
        )
        candidates_qs = Video.objects.filter(id__in=similar_ids).annotate(
            distance=Subquery(subquery)
        )

    # 2. Rerank candidates and select top 30
    top_30_similar_data = rerank_videos_by_scores(candidates_qs, limit=30)
    top_30_similar_ids = [item[0] for item in top_30_similar_data]

    scores_map = {}
    for vid, total_score, s_sim, s_eng, s_rec in top_30_similar_data:
        scores_map[vid] = {
            "total_score": total_score,
            "similarity_score": s_sim,
            "engagement_score": s_eng,
            "recency_score": s_rec,
        }

    # 3. Trending videos (limit 10, excluding seen and similar ones)
    exclude_ids = set(seen_video_ids) | set(top_30_similar_ids)
    trending_qs = get_trending_videos(limit=100)
    trending_ids = [
        tid
        for tid in trending_qs.values_list("id", flat=True)
        if tid not in exclude_ids
    ][:10]

    # Calculate actual scores for trending videos (similarity is 0.0)
    if trending_ids:
        current_time = now()
        watch_time_subquery = (
            VideoView.objects.filter(video_id=OuterRef("pk"))
            .values("video_id")
            .annotate(total=Sum("watch_time"))
            .values("total")[:1]
        )
        trending_annotated = list(
            Video.objects.filter(id__in=trending_ids).annotate(
                total_watch_time=Coalesce(Subquery(watch_time_subquery), 0)
            )
        )
        for video in trending_annotated:
            score, s_sim, s_eng, s_rec = calculate_video_scores(
                video, None, current_time
            )
            scores_map[video.id] = {
                "total_score": score,
                "similarity_score": s_sim,
                "engagement_score": s_eng,
                "recency_score": s_rec,
            }

    # 4. Combine IDs and query queryset preserving order
    combined_ids = top_30_similar_ids + trending_ids
    if not combined_ids:
        return Video.objects.none(), {}

    order = Case(
        *[When(pk=pk, then=Value(idx)) for idx, pk in enumerate(combined_ids)],
        output_field=IntegerField(),
    )
    return Video.objects.filter(id__in=combined_ids).order_by(order), scores_map


def search_videos(
    *,
    keyword: str,
    base_qs: QuerySet[Video],
    size: int = VIDEO_SEARCH_DEFAULT_SIZE,
    cursor: str | None = None,
) -> Tuple[QuerySet[Video], str | None]:
    """
    Search videos via Elasticsearch (title, description, tags) using `search_after`.

    Returns:
      (queryset, next_cursor)
    """

    s = (
        VideoDocument.search()
        .query(
            "bool",
            should=[
                {
                    "multi_match": {
                        "query": keyword,
                        "fields": ["title^3", "description"],
                        "type": "phrase_prefix",
                    }
                },
                {
                    "prefix": {
                        "tags": {
                            "value": keyword.lower(),
                            "boost": 2,
                        }
                    }
                },
            ],
        )
        .sort({"_score": "desc"}, {"id": "desc"})
        .extra(size=size)
    )

    if cursor:
        s = s.extra(search_after=decode_search_after_cursor(cursor))

    resp = s.execute()
    hits = resp.hits
    ids = [int(hit.meta.id) for hit in hits]

    if not ids:
        return base_qs.none(), None

    order = Case(
        *[When(pk=pk, then=Value(idx)) for idx, pk in enumerate(ids)],
        output_field=IntegerField(),
    )
    qs = base_qs.filter(pk__in=ids).order_by(order)

    next_cursor = None
    last_hit = hits[-1] if hits else None
    if last_hit is not None and hasattr(last_hit.meta, "sort"):
        sort_values = getattr(last_hit.meta, "sort", None)
        if isinstance(sort_values, (list, tuple)):
            next_cursor = encode_search_after_cursor(list(sort_values))

    return qs, next_cursor


def delete_video(video: Video) -> None:
    """
    Hard delete a video and all associated data:
    - Notifications referencing this video
    - S3 files (video, HLS segments, thumbnail)
    - Video DB record (cascades to reactions, views, comments, embedding)
    """

    # Delete notifications referencing this video
    content_type = ContentType.objects.get_for_model(Video)
    Notification.objects.filter(
        target_content_type=content_type,
        target_object_id=video.pk,
    ).delete()

    # Delete S3 files
    if video.video_key:
        delete_s3_object(video.video_key)

    if video.hls_playlist_key:
        prefix = "/".join(video.hls_playlist_key.split("/")[:-1]) + "/"
        delete_s3_directory(prefix)

    if video.thumbnail:
        video.thumbnail.delete(save=False)

    # Hard delete (cascades to reactions, views, comments, embedding)
    pk = video.pk
    video.delete(force_policy=HARD_DELETE)
    logger.info("Hard deleted video pk=%s", pk)
