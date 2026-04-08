from rest_framework import routers as drf_routers

from apps.notifications.apis import NotificationRecipientViewSet
from apps.oauth.apis import OAuthViewSet
from apps.recommendation.apis import VideoEmbeddingViewSet
from apps.users.apis import UserViewSet
from apps.videos.apis import VideoViewSet
from apps.comments.apis import VideoCommentViewSet

api_router = drf_routers.SimpleRouter(trailing_slash=False)
api_router.register(r"auth", OAuthViewSet, basename="auth")
api_router.register(r"users", UserViewSet, basename="user")
api_router.register(r"videos", VideoViewSet, basename="video")
api_router.register(
    r"notifications", NotificationRecipientViewSet, basename="notification"
)
api_router.register(
    r"video-embeddings", VideoEmbeddingViewSet, basename="video-embedding"
)
api_router.register(r"comments", VideoCommentViewSet, basename="comment")

# Add api router urls
urlpatterns = []
urlpatterns += api_router.urls
