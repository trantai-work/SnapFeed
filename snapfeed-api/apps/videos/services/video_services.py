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
from django.db.models.functions import Extract, Now, Random
from pgvector.django import CosineDistance
from safedelete.models import HARD_DELETE

from apps.notifications.models import Notification
from apps.recommendation.models import VideoEmbedding
from apps.users.models import User
from apps.videos.constants import VIDEO_SEARCH_DEFAULT_SIZE
from apps.videos.documents import VideoDocument
from apps.videos.exceptions import VideoWithS3KeyNotFound
from apps.videos.models import Video
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


def get_trending_videos(limit: int = 25) -> QuerySet[Video]:
    """
    Get trending videos based on custom score.
    """

    return (
        Video.objects.annotate(
            total_watch_time=Sum("video_views__watch_time"),
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
        .order_by("-trending_score")
    )


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

    trending_pool = get_trending_videos(limit=1000).order_by(Random())
    feeds = trending_pool[:25]

    return feeds


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
            "multi_match",
            query=keyword,
            fields=["title^3", "description", "tags^2"],
            type="best_fields",
            operator="and",
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
