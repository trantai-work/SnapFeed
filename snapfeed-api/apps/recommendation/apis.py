from django.conf import settings
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.mixins import CreateModelMixin

from apps.recommendation.models import VideoEmbedding
from apps.recommendation.serializers import VideoEmbeddingSerializer
from apps.videos.services import video_services
from core.apis import BaseAPIViewSet
from core.messages import ERROR_MESSAGES


@extend_schema(tags=["video-embeddings"])
class VideoEmbeddingViewSet(CreateModelMixin, BaseAPIViewSet):
    """
    API Endpoint for VideoEmbedding model.
    """

    serializer_class = VideoEmbeddingSerializer
    queryset = VideoEmbedding.objects.all()
    permission_classes = []

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Cover endpoint with API key.
        """

        api_key = request.headers.get("X-API-KEY")

        if not api_key:
            return self.response_error(ERROR_MESSAGES["lack_of_api_key"])

        if api_key != settings.API_KEY:
            return self.response_error(ERROR_MESSAGES["invalid_api_key"])

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        video_s3_key = serializer.validated_data.pop("video_s3_key")
        video = video_services.get_video_by_s3_key(video_s3_key)

        serializer.save(video=video)

        return self.response_ok(serializer.data)
