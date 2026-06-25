from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Count, Exists, OuterRef
from rest_framework.decorators import action
from rest_framework import status

from apps.users.constants import USER_SEARCH_DEFAULT_SIZE, USER_SEARCH_MAX_SIZE
from apps.users.models import User, UserFollow
from apps.users.pagination import UserFollowPagination
from apps.users.serializers import UserSerializer
from apps.users.services import user_services, follow_services
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

    def get_queryset(self):
        """
        Annotate queryset with follow counts and is_following status.
        """
        qs = super().get_queryset()
        request = self.request
        user = getattr(request, "user", None)

        # Annotate follower/following counts
        qs = qs.annotate(
            follower_count=Count("followers", distinct=True),
            following_count=Count("following", distinct=True),
        )

        # Annotate is_following if user is authenticated
        if user and user.is_authenticated:
            qs = qs.annotate(
                is_following=Exists(
                    UserFollow.objects.filter(
                        follower=user,
                        following=OuterRef("pk"),
                    )
                )
            )

        return qs

    @action(detail=False, methods=["get"], url_path="me")
    def get_current_user_information(self, request):
        """
        Get current user information.
        """

        user = request.user
        annotated = (
            self.get_queryset()
            .annotate(like_count=Count("videos__reactions", distinct=True))
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
            self.get_queryset()
            .annotate(like_count=Count("videos__reactions", distinct=True))
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

    @action(
        detail=True,
        methods=["post"],
        url_path="follow",
    )
    def follow(self, request, pk=None):
        """
        Follow a user.
        """

        target_user = self.get_object()
        current_user = request.user

        follow_services.follow_user(current_user, target_user)
        return self.response_created()

    @action(
        detail=True,
        methods=["delete"],
        url_path="unfollow",
    )
    def unfollow(self, request, pk=None):
        """
        Unfollow a user.
        """

        target_user = self.get_object()
        current_user = request.user

        follow_services.unfollow_user(current_user, target_user)
        return self.response(status_code=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="q",
                description="Search query for username, first_name, or last_name",
                required=False,
                type=str,
            ),
        ]
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="followers",
    )
    def followers(self, request, pk=None):
        """
        Get list of followers for a user (cursor pagination).
        Query params:
        - q: search by username, first_name, or last_name
        """

        target_user = self.get_object()

        qs = (
            self.get_queryset()
            .filter(following__following=target_user)
            .order_by("-following__created_at", "-id")
        )

        # Filter by search query
        search_query = request.query_params.get("q", "")
        qs = follow_services.filter_users_by_search(qs, search_query)

        return self.response_pagination(
            request=request,
            queryset=qs,
            serializer_class=UserSerializer,
            pagination_class=UserFollowPagination,
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="q",
                description="Search query for username, first_name, or last_name",
                required=False,
                type=str,
            ),
        ]
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="following",
    )
    def following(self, request, pk=None):
        """
        Get list of users that this user is following (cursor pagination).
        Query params:
        - q: search by username, first_name, or last_name
        """

        target_user = self.get_object()

        qs = (
            self.get_queryset()
            .filter(followers__follower=target_user)
            .order_by("-followers__created_at", "-id")
        )

        # Filter by search query
        search_query = request.query_params.get("q", "")
        qs = follow_services.filter_users_by_search(qs, search_query)

        return self.response_pagination(
            request=request,
            queryset=qs,
            serializer_class=UserSerializer,
            pagination_class=UserFollowPagination,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="reset-recommendations",
    )
    def reset_recommendations(self, request):
        """
        Reset recommendation preferences for the current user.
        Deletes UserEmbedding and VideoViews.
        """
        user = request.user
        user_services.reset_user_recommendations(user)
        return self.response_ok(
            message="Recommendation preferences reset successfully."
        )
