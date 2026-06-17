from django.db.models import Subquery, OuterRef
from pgvector.django import CosineDistance

from apps.users.models import User
from apps.videos.models import Video
from apps.recommendation.models import VideoEmbedding


def search_users_for_moderator(q: str) -> list[dict]:
    """
    Search users by username, email, first name, or last name.
    """
    q = q.strip()
    if not q:
        return []

    users = (
        User.objects.filter(username__icontains=q)
        | User.objects.filter(email__icontains=q)
        | User.objects.filter(first_name__icontains=q)
        | User.objects.filter(last_name__icontains=q)
    )

    users = users.distinct()[:10]

    result = []
    for u in users:
        has_emb = hasattr(u, "embedding")
        result.append(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "avatar_url": u.avatar_url,
                "has_embedding": has_emb,
            }
        )
    return result


def get_user_preferences_statistics(user_id: int) -> dict:
    """
    Calculate user preference statistics based on vector similarity and video tags.
    """
    try:
        target_user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return {"error": "Người dùng không tồn tại", "status_code": 404}

    if not hasattr(target_user, "embedding"):
        return {
            "has_embedding": False,
            "message": "Người dùng này chưa có dữ liệu xem video để phân tích.",
            "tags": [],
        }

    user_embedding = target_user.embedding.embedding

    # Find top 20 nearest videos using CosineDistance
    subquery = (
        VideoEmbedding.objects.filter(video_id=OuterRef("pk"))
        .annotate(distance=CosineDistance("embedding", user_embedding))
        .values("distance")[:1]
    )

    videos = (
        Video.objects.annotate(distance=Subquery(subquery))
        .filter(distance__isnull=False)
        .prefetch_related("tags")
        .order_by("distance")[:20]
    )

    tag_counts = {}
    tag_weights = {}

    for video in videos:
        distance = getattr(video, "distance", 1.0)
        if distance is None:
            distance = 1.0
        similarity = max(0.0, min(1.0, 1.0 - distance))

        for tag in video.tags.all():
            tag_name = tag.name
            tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1
            tag_weights[tag_name] = tag_weights.get(tag_name, 0.0) + similarity

    # Build statistics for all tags
    all_tags = []
    for tag_name, count in tag_counts.items():
        weight = tag_weights[tag_name]
        all_tags.append(
            {"name": tag_name, "count": count, "weight_score": round(weight, 3)}
        )

    # Sort tags by frequency (count) descending, then take top 10
    all_tags.sort(key=lambda x: x["count"], reverse=True)
    top_10_tags = all_tags[:10]

    # Calculate percentages based on total count of top 10 tags
    total_top_10_count = sum(t["count"] for t in top_10_tags)
    for tag in top_10_tags:
        if total_top_10_count > 0:
            tag["percentage"] = round((tag["count"] / total_top_10_count) * 100, 1)
        else:
            tag["percentage"] = 0.0

    return {
        "has_embedding": True,
        "accumulated_weight": target_user.embedding.accumulated_weight,
        "tags": top_10_tags,
    }
