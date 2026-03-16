from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from config import routes

from core.jwt_authentication.views import CookieTokenObtainPairView

urlpatterns = [
    path("api/v1/auth/login", CookieTokenObtainPairView.as_view(), name="login"),
    # Implement later (Cookie)
    # path(
    #     "api/v1/auth/refresh",
    #     TokenRefreshView.as_view(),
    #     name="token_refresh",
    # ),
    # path("api/v1/auth/logout", TokenBlacklistView.as_view(), name="logout"),
    path("api/v1/", include(routes)),
]


urlpatterns += [
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
