from typing import Optional

from django.db.models import QuerySet, OuterRef, Subquery, Value, Q
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


def get_trending_videos(limit=15) -> QuerySet[Video]:
    """
    Get trending videos base on custom score.
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
        .order_by("-trending_score")[:limit]
    )


def get_similar_videos(
    user_embedding: list[float], exclude_video_ids: Optional[QuerySet] = None
) -> QuerySet[Video]:
    """
    Return lazy QuerySet of Videos ordered by similarity to user's embedding,
    optionally excluding videos in exclude_video_ids.
    """

    subquery = (
        VideoEmbedding.objects.filter(video_id=OuterRef("pk"))
        .annotate(distance=CosineDistance("embedding", user_embedding))
        .values("distance")[:1]
    )

    queryset = Video.objects.annotate(distance=Subquery(subquery))

    if exclude_video_ids:
        queryset = queryset.exclude(id__in=exclude_video_ids)

    return queryset.order_by("distance")


def get_random_videos(
    limit: int = 15, exclude_video_ids: Optional[QuerySet] = None
) -> QuerySet[Video]:
    """
    Return a lazy QuerySet with multiple random Videos.
    """

    queryset = Video.objects.all()

    if exclude_video_ids:
        queryset = queryset.exclude(id__in=exclude_video_ids)

    return queryset.order_by(Random())[:limit]


def get_default_feeds() -> QuerySet[Video]:
    """
    Get default feed for user: combine trending + random videos.
    Random videos will exclude trending videos to avoid duplication.
    """

    trending_ids = get_trending_videos().values_list("id", flat=True)
    random_ids = get_random_videos(exclude_video_ids=trending_ids).values_list(
        "id", flat=True
    )

    return Video.objects.filter(Q(id__in=trending_ids) | Q(id__in=random_ids)).annotate(
        distance=Value(0.0, FloatField())
    )
