from drf_spectacular.utils import extend_schema
from rest_framework import mixins

from apps.comments.filters import VideoCommentFilter
from apps.comments.models import VideoComment
from apps.comments.pagination import VideoCommentPagination
from apps.comments.serializers import VideoCommentSerializer
from apps.comments.services import comment_services
from core.apis import BaseAPIViewSet
from core.permissions import FullDjangoModelPermissions


@extend_schema(tags=["comments"])
class VideoCommentViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, BaseAPIViewSet
):
    serializer_class = VideoCommentSerializer
    permission_classes = [FullDjangoModelPermissions]
    pagination_class = VideoCommentPagination
    filterset_class = VideoCommentFilter
    queryset = (
        VideoComment.objects.select_related("user", "video")
        .order_by("-created_at", "-id")
        .all()
    )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        video = serializer.validated_data["video"]
        content = serializer.validated_data["content"]

        comment = comment_services.create_video_comment(
            user=request.user,
            video=video,
            content=content,
        )

        return self.response_created(self.get_serializer(comment).data)
