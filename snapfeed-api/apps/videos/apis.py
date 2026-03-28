from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
import boto3
from rest_framework import mixins

from apps.videos.constants import MAX_VIDEO_UPLOAD_SIZE
from apps.videos.models import Video
from apps.videos.pagination import FeedPagination
from apps.videos.permissions import GeneratePresignedUrlPermission
from apps.videos.serializers import PresignedUrlSerializer, VideoSerializer
from apps.videos.services import video_services, s3_services
from core.apis import BaseAPIViewSet
from core.permissions import FullDjangoModelPermissions
from utils import random


@extend_schema(tags=["videos"])
class VideoViewSet(mixins.CreateModelMixin, BaseAPIViewSet):
    serializer_class = VideoSerializer
    queryset = Video.objects.all()
    permission_classes = [FullDjangoModelPermissions]

    def perform_create(self, serializer):
        """
        Create metadata for video in S3.
        """

        user = self.request.user
        video_key = serializer.validated_data["video_key"]

        s3_services.validate_s3_key_format(video_key, user.id)
        s3_services.check_s3_object_exists(video_key)

        serializer.save(user=self.request.user)

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

        s3_client = boto3.client("s3")

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

    @action(detail=False, methods=["get"], url_path="feeds", permission_classes=[])
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

        return self.response_pagination(
            request=request,
            queryset=feeds,
            serializer_class=self.get_serializer_class(),
            pagination_class=FeedPagination,
        )
