from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.decorators import action

from apps.users.constants import USER_SEARCH_DEFAULT_SIZE, USER_SEARCH_MAX_SIZE
from apps.users.models import User
from apps.users.serializers import UserSerializer
from apps.users.services import user_services
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
        Search users by keyword (Elasticsearch).
        """

        keyword = (request.query_params.get("keyword") or "").strip()
        if not keyword:
            return self.response_ok({"results": [], "next_cursor": None})

        cursor = (request.query_params.get("cursor") or "").strip() or None
        size_raw = (request.query_params.get("size") or "").strip()
        size = USER_SEARCH_DEFAULT_SIZE
        if size_raw:
            try:
                size = max(1, min(USER_SEARCH_MAX_SIZE, int(size_raw)))
            except ValueError:
                size = USER_SEARCH_DEFAULT_SIZE

        qs, next_cursor = user_services.search_users(
            keyword=keyword, base_qs=self.get_queryset(), size=size, cursor=cursor
        )
        return self.response_ok(
            {
                "results": self.get_serializer(qs, many=True).data,
                "next": next_cursor,
            }
        )
