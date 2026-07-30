from django.conf import settings
from django.urls import path, include
from django.http import HttpResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from config import routes

from core.jwt_authentication.views import (
    CookieTokenObtainPairView,
    CookieTokenBlacklistView,
    CookieTokenRefreshView,
)

from apps.reports.apis import (
    SystemStatsViewSet,
    ModeratorVideoViewSet,
    ModeratorVideoCommentViewSet,
)


def health_check(request):
    return HttpResponse("OK", content_type="text/plain")


urlpatterns = [
    path("healthz", health_check, name="health_check"),
    path("api/v1/auth/refresh", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/logout", CookieTokenBlacklistView.as_view(), name="logout"),
    path(
        "api/v1/system-stats/",
        SystemStatsViewSet.as_view({"get": "list"}),
        name="system_stats",
    ),
    path(
        "api/v1/moderator/videos/<int:pk>/",
        ModeratorVideoViewSet.as_view({"get": "retrieve"}),
        name="moderator_video_detail",
    ),
    path(
        "api/v1/moderator/comments/",
        ModeratorVideoCommentViewSet.as_view({"get": "list"}),
        name="moderator_comments_list",
    ),
    path(
        "api/v1/moderator/comments/<int:pk>/",
        ModeratorVideoCommentViewSet.as_view({"get": "retrieve"}),
        name="moderator_comment_detail",
    ),
    path("api/v1/", include(routes)),
]


if settings.DEBUG:
    urlpatterns += [
        path("api/v1/auth/login", CookieTokenObtainPairView.as_view(), name="login"),
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        # Swagger and API Docs
        path("api/v1/schema", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/v1/swagger",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger",
        ),
        path(
            "api/v1/docs",
            SpectacularRedocView.as_view(url_name="schema"),
            name="docs",
        ),
    ]
