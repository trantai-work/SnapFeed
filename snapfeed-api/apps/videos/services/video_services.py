from typing import Optional

from django.db.models import OuterRef, QuerySet, Subquery
from django.db.models import F, Sum, Count, FloatField, ExpressionWrapper
from django.db.models.functions import Now, Random, Extract
from pgvector.django import CosineDistance

from apps.recommendation.models import VideoEmbedding
from apps.users.models import User
from apps.videos.exceptions import VideoWithS3KeyNotFound
from apps.videos.models import Video


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
