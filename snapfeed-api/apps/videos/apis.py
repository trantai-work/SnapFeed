from django.conf import settings
from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
import boto3
from botocore.config import Config
from rest_framework import mixins

from apps.videos.constants import (
    MAX_VIDEO_UPLOAD_SIZE,
    VIDEO_SEARCH_DEFAULT_SIZE,
    VIDEO_SEARCH_MAX_SIZE,
)
from apps.videos.models import Video, VideoReaction
from apps.videos.permissions import (
    GeneratePresignedUrlPermission,
    ReactVideoPermissions,
)
from apps.videos.serializers import (
    PresignedUrlSerializer,
    VideoSerializer,
    VideoReactionSerializer,
)
from apps.notifications.services import notification_services
from apps.videos.services import reaction_services, s3_services, video_services
from apps.videos.services import tag_services
from core.apis import BaseAPIViewSet
from core.permissions import FullDjangoModelPermissions
from utils import random


@extend_schema(tags=["videos"])
class VideoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    BaseAPIViewSet,
):
    serializer_class = VideoSerializer
    queryset = Video.objects.all()
    permission_classes = [FullDjangoModelPermissions]

    def get_queryset(self):
        from django.db.models import Exists, OuterRef
        from apps.users.models import UserFollow

        qs = Video.objects.select_related("user").prefetch_related("tags").all()
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            qs = qs.prefetch_related(
                Prefetch(
                    "reactions",
                    queryset=VideoReaction.objects.filter(user=user),
                    to_attr="_prefetched_user_reactions",
                )
            )
            # Annotate is_following for video owner
            qs = qs.annotate(
                is_following_owner=Exists(
                    UserFollow.objects.filter(
                        follower=user,
                        following=OuterRef("user_id"),
                    )
                )
            )
        return qs

    def perform_create(self, serializer):
        """
        Create metadata for video in S3.
        """

        user = self.request.user
        video_key = serializer.validated_data["video_key"]

        s3_services.validate_s3_key_format(video_key, user.id)
        s3_services.check_s3_object_exists(video_key)

        raw_names = serializer.validated_data.pop("tags_input", None)

        video = serializer.save(user=self.request.user)
        final_tags = tag_services.sync_video_tags_from_names(
            video=video, names=raw_names
        )
        if final_tags is not None:
            # Make serializer output `tags` without extra queries later.
            prefetched = getattr(video, "_prefetched_objects_cache", None)
            if prefetched is None:
                video._prefetched_objects_cache = {}
                prefetched = video._prefetched_objects_cache
            prefetched["tags"] = final_tags

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[GeneratePresignedUrlPermission],
        serializer_class=PresignedUrlSerializer,
    )
    def generate_presigned_url(self, request):
        """
        Generate a S3 presigned URL.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file_name = serializer.validated_data["file_name"]
        content_type = serializer.validated_data["content_type"]

        uuid_file_name = random.add_uuid_to_filename(file_name)
        s3_key = f"videos/{request.user.id}/{uuid_file_name}"

        s3_client = boto3.client(
            "s3",
            region_name=settings.AWS_DEFAULT_REGION,
            config=Config(s3={"addressing_style": "path"}),
        )

        presigned_post = s3_client.generate_presigned_post(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, MAX_VIDEO_UPLOAD_SIZE],
            ],
            ExpiresIn=3600,
        )

        return self.response_ok(presigned_post)

    @action(
        detail=False,
        methods=["get"],
        url_path="feeds",
        permission_classes=[],
        pagination_class=None,
    )
    def get_feeds(self, request):
        """
        Get feeds for user.
        """

        user = request.user

        if not hasattr(user, "embedding"):
            feeds = video_services.get_default_feeds()
        else:
            seen_video_ids = video_services.get_seen_video(user).values_list(
                "id", flat=True
            )
            user_embedding = user.embedding.embedding
            feeds = video_services.get_similar_videos(user_embedding, seen_video_ids)

        feeds = feeds.select_related("user").prefetch_related("tags")
        if user.is_authenticated:
            feeds = feeds.prefetch_related(
                Prefetch(
                    "reactions",
                    queryset=VideoReaction.objects.filter(user=user),
                    to_attr="_prefetched_user_reactions",
                )
            )

        return self.response_ok(self.get_serializer(feeds, many=True).data)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="keyword",
                description="Search query",
                required=True,
                type=str,
            ),
            OpenApiParameter(
                name="size",
                description="Result size",
                required=False,
                type=int,
            ),
        ]
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="search",
        permission_classes=[],
        pagination_class=None,
    )
    def search(self, request):
        """
        Search videos by keyword (Elasticsearch).
        """

        keyword = (request.query_params.get("keyword") or "").strip()
        if not keyword:
            return self.response_ok({"results": [], "next_cursor": None})

        cursor = (request.query_params.get("cursor") or "").strip() or None
        size_raw = (request.query_params.get("size") or "").strip()
        size = VIDEO_SEARCH_DEFAULT_SIZE
        if size_raw:
            try:
                size = max(1, min(VIDEO_SEARCH_MAX_SIZE, int(size_raw)))
            except ValueError:
                size = VIDEO_SEARCH_DEFAULT_SIZE

        qs, next_cursor = video_services.search_videos(
            keyword=keyword, base_qs=self.get_queryset(), size=size, cursor=cursor
        )
        return self.response_ok(
            {
                "results": self.get_serializer(qs, many=True).data,
                "next": next_cursor,
            }
        )

    @extend_schema(
        request=VideoReactionSerializer,
        responses={200: VideoReactionSerializer},
    )
    @action(
        detail=True,
        methods=["put"],
        url_path="react",
        permission_classes=[ReactVideoPermissions],
        serializer_class=VideoReactionSerializer,
    )
    def video_react(self, request, pk=None):
        """
        Set or change the current user's reaction on this video.
        """

        video = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reaction_row, count, is_new_reaction = reaction_services.set_video_reaction(
            request.user, video, serializer.validated_data["reaction"]
        )

        if is_new_reaction:
            notification_services.notify_video_react(
                request.user,
                video,
                reaction=reaction_row.reaction,
            )

        if reaction_row is None:
            return self.response_ok(
                {
                    "id": None,
                    "user": request.user.id,
                    "video": video.id,
                    "reaction": None,
                    "reaction_count": count,
                }
            )

        return self.response_ok(
            self.get_serializer(
                reaction_row,
                context={**self.get_serializer_context(), "reaction_count": count},
            ).data
        )
