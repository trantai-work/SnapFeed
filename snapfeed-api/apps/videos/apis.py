from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
import boto3
from rest_framework import mixins

from apps.videos.constants import MAX_VIDEO_UPLOAD_SIZE
from apps.videos.models import Video
from apps.videos.serializers import PresignedUrlSerializer, VideoSerializer
from core.apis import BaseAPIViewSet
from utils import random


@extend_schema(tags=["videos"])
class VideoViewSet(mixins.CreateModelMixin, BaseAPIViewSet):
    serializer_class = VideoSerializer
    queryset = Video.objects.all()
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """
        Create metadata for video in S3.
        """

        serializer.save(user=self.request.user)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
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
