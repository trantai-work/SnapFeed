from django.conf import settings
from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework import mixins
from rest_framework.exceptions import PermissionDenied

from apps.videos.constants import (
    VIDEO_SEARCH_DEFAULT_SIZE,
    VIDEO_SEARCH_MAX_SIZE,
    VideoStatus,
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
    VideoViewSerializer,
    InitiateMultipartUploadSerializer,
    GeneratePartPresignedUrlSerializer,
    CompleteMultipartUploadSerializer,
    AbortMultipartUploadSerializer,
)
from apps.notifications.services import notification_services
from apps.videos.services import (
    reaction_services,
    s3_services,
    video_services,
    view_services,
)
from apps.videos.services import tag_services
from core.apis import BaseAPIViewSet
from core.messages import ERROR_MESSAGES
from core.permissions import FullDjangoModelPermissions, IsUserAuthenticated
from utils import random


@extend_schema(tags=["videos"])
class VideoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
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

    def perform_destroy(self, instance):
        """Hard delete video and all associated S3 files."""
        if instance.user_id != self.request.user.id:
            raise PermissionDenied()
        video_services.delete_video(instance)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[GeneratePresignedUrlPermission],
        serializer_class=PresignedUrlSerializer,
    )
    def generate_presigned_url(self, request):
        """
        Generate a S3 presigned URL (single-part upload).
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file_name = serializer.validated_data["file_name"]
        content_type = serializer.validated_data["content_type"]

        uuid_file_name = random.add_uuid_to_filename(file_name)
        s3_key = f"videos/{request.user.id}/{uuid_file_name}"

        presigned_post = s3_services.generate_presigned_post(
            s3_key=s3_key,
            content_type=content_type,
        )

        return self.response_ok(presigned_post)

    @action(
        detail=False,
        methods=["post"],
        url_path="multipart/initiate",
        permission_classes=[GeneratePresignedUrlPermission],
        serializer_class=InitiateMultipartUploadSerializer,
    )
    def initiate_multipart_upload(self, request):
        """
        Initiate a multipart upload session.
        Returns upload_id and s3_key to be used in subsequent part uploads.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file_name = serializer.validated_data["file_name"]
        content_type = serializer.validated_data["content_type"]

        uuid_file_name = random.add_uuid_to_filename(file_name)
        s3_key = f"videos/{request.user.id}/{uuid_file_name}"

        upload_id = s3_services.initiate_multipart_upload(
            s3_key=s3_key,
            content_type=content_type,
        )

        return self.response_ok({"upload_id": upload_id, "s3_key": s3_key})

    @action(
        detail=False,
        methods=["post"],
        url_path="multipart/presigned-url",
        permission_classes=[GeneratePresignedUrlPermission],
        serializer_class=GeneratePartPresignedUrlSerializer,
    )
    def generate_part_presigned_url(self, request):
        """
        Generate a presigned URL for uploading a single part.
        Client PUTs the chunk to this URL and saves the ETag from the response header.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        s3_key = serializer.validated_data["s3_key"]
        upload_id = serializer.validated_data["upload_id"]
        part_number = serializer.validated_data["part_number"]

        s3_services.validate_s3_key_format(s3_key, request.user.id)

        presigned_url = s3_services.generate_part_presigned_url(
            s3_key=s3_key,
            upload_id=upload_id,
            part_number=part_number,
        )

        return self.response_ok(
            {"presigned_url": presigned_url, "part_number": part_number}
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="multipart/complete",
        permission_classes=[GeneratePresignedUrlPermission],
        serializer_class=CompleteMultipartUploadSerializer,
    )
    def complete_multipart_upload(self, request):
        """
        Complete a multipart upload by assembling all uploaded parts.
        `parts` is a list of { part_number, etag } collected from each part upload response.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        s3_key = serializer.validated_data["s3_key"]
        upload_id = serializer.validated_data["upload_id"]
        parts = serializer.validated_data["parts"]

        s3_services.validate_s3_key_format(s3_key, request.user.id)

        s3_services.complete_multipart_upload(
            s3_key=s3_key,
            upload_id=upload_id,
            parts=parts,
        )

        return self.response_ok({"s3_key": s3_key})

    @action(
        detail=False,
        methods=["post"],
        url_path="multipart/abort",
        permission_classes=[GeneratePresignedUrlPermission],
        serializer_class=AbortMultipartUploadSerializer,
    )
    def abort_multipart_upload(self, request):
        """
        Abort a multipart upload session and clean up all uploaded parts from S3.
        Should be called when the upload is cancelled or fails on the client side.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        s3_key = serializer.validated_data["s3_key"]
        upload_id = serializer.validated_data["upload_id"]

        s3_services.validate_s3_key_format(s3_key, request.user.id)

        s3_services.abort_multipart_upload(
            s3_key=s3_key,
            upload_id=upload_id,
        )

        return self.response_ok({"s3_key": s3_key})

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

    @action(
        detail=False,
        methods=["get"],
        url_path="metadata-by-key",
        permission_classes=[],
    )
    def get_by_key(self, request):
        """
        Get video metadata by S3 key (for worker-ai only).
        """

        api_key = request.headers.get("X-API-KEY")

        if not api_key:
            return self.response_error(message=ERROR_MESSAGES["lack_of_api_key"])

        if api_key != settings.API_KEY:
            return self.response_error(message=ERROR_MESSAGES["invalid_api_key"])

        video_key = request.query_params.get("video_key")
        if not video_key:
            return self.response_error(
                message=ERROR_MESSAGES["video_s3_key_is_required"]
            )

        video = video_services.get_video_by_s3_key(video_key)
        video = Video.objects.prefetch_related("tags").get(pk=video.pk)

        return self.response_ok(self.get_serializer(video).data)

    @action(
        detail=True,
        methods=["put"],
        url_path="view",
        permission_classes=[IsUserAuthenticated],
    )
    def record_view(self, request, pk=None):
        """
        Record or update a video view for the authenticated user.
        Updates watch_time to max(existing, new).
        """

        video = self.get_object()
        serializer = VideoViewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        view = view_services.record_video_view(
            user=request.user,
            video=video,
            watch_time=serializer.validated_data["watch_time"],
        )

        if view is None:
            return self.response_ok({"recorded": False})

        video.refresh_from_db(fields=["view_count"])

        return self.response_ok(
            {
                "recorded": True,
                "video": video.id,
                "watch_time": view.watch_time,
                "view_count": video.view_count,
            }
        )

    @action(
        detail=False,
        methods=["patch"],
        url_path="update-status-by-key",
        permission_classes=[],
    )
    def update_status_by_key(self, request):
        """
        Update video status and HLS playlist key by S3 key (for worker-ai only).
        """

        api_key = request.headers.get("X-API-KEY")

        if not api_key:
            return self.response_error(message=ERROR_MESSAGES["lack_of_api_key"])

        if api_key != settings.API_KEY:
            return self.response_error(message=ERROR_MESSAGES["invalid_api_key"])

        video_s3_key = request.data.get("video_s3_key")
        if not video_s3_key:
            return self.response_error(
                message=ERROR_MESSAGES["video_s3_key_is_required"]
            )

        video = video_services.get_video_by_s3_key(video_s3_key)

        status = request.data.get("status")
        hls_playlist_key = request.data.get("hls_playlist_key")

        if status and status not in [s.value for s in VideoStatus]:
            return self.response_error(message=ERROR_MESSAGES["invalid_video_status"])

        if status:
            video.status = status
        if hls_playlist_key:
            video.hls_playlist_key = hls_playlist_key

        video.save(update_fields=["status", "hls_playlist_key", "updated_at"])

        return self.response_ok(self.get_serializer(video).data)
