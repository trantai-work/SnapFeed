from drf_spectacular.utils import extend_schema
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.decorators import action

from apps.users.models import User
from apps.users.serializers import UserSerializer
from apps.videos.models import Video
from apps.videos.pagination import VideCursorPagination
from apps.videos.permissions import ViewVideoPermissions
from apps.videos.serializers import VideoSerializer
from core.apis import BaseAPIViewSet
from core.permissions import IsUserAuthenticated


@extend_schema(tags=["users"])
class UserViewSet(BaseAPIViewSet):
    permission_classes = [IsUserAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=["get"], url_path="me")
    def get_current_user_information(self, request):
        """
        Get current user information.
        """

        user = request.user
        annotated = (
            User.objects.annotate(like_count=Coalesce(Sum("videos__reaction_count"), 0))
            .filter(pk=user.pk)
            .first()
        )
        if annotated is not None:
            user = annotated
        serializer = self.get_serializer(user)
        return self.response_ok(serializer.data)

    @action(detail=True, methods=["get"], url_path="profile")
    def profile(self, request, pk=None):
        """
        Get user profile information by id.
        """

        user = self.get_object()
        annotated = (
            User.objects.annotate(like_count=Coalesce(Sum("videos__reaction_count"), 0))
            .filter(pk=user.pk)
            .first()
        )
        if annotated is not None:
            user = annotated
        serializer = self.get_serializer(user)
        return self.response_ok(serializer.data)

    @action(
        detail=True,
        methods=["get"],
        url_path="videos",
        permission_classes=[ViewVideoPermissions],
    )
    def videos(self, request, pk=None):
        """
        List videos of a user (cursor pagination).
        """

        user = self.get_object()

        qs = (
            Video.objects.filter(user=user)
            .select_related("user")
            .prefetch_related("tags")
            .order_by("-created_at", "-id")
        )

        return self.response_pagination(
            request=request,
            queryset=qs,
            serializer_class=VideoSerializer,
            pagination_class=VideCursorPagination,
        )

    @action(
        detail=True,
        methods=["get"],
        url_path="reacted_videos",
        permission_classes=[ViewVideoPermissions],
    )
    def reacted_videos(self, request, pk=None):
        """
        List videos that the user has reacted to (cursor pagination).
        """

        user = self.get_object()

        qs = (
            Video.objects.filter(reactions__user=user)
            .select_related("user")
            .prefetch_related("tags")
            .order_by("-created_at", "-id")
            .distinct()
        )

        return self.response_pagination(
            request=request,
            queryset=qs,
            serializer_class=VideoSerializer,
            pagination_class=VideCursorPagination,
        )
