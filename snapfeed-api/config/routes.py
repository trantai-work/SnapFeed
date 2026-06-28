from rest_framework import routers as drf_routers

from apps.notifications.apis import NotificationRecipientViewSet
from apps.oauth.apis import OAuthViewSet
from apps.recommendation.apis import (
    VideoEmbeddingViewSet,
    ModeratorUserPreferenceViewSet,
)
from apps.reports.apis import VideoReportViewSet
from apps.users.apis import UserViewSet, ModeratorUserViewSet
from apps.videos.apis import VideoViewSet
from apps.comments.apis import VideoCommentViewSet
from apps.chats.apis import ConversationViewSet, MessageViewSet
from apps.support.apis import UserSupportTicketViewSet, ModeratorSupportTicketViewSet
from apps.music.apis import MusicViewSet

api_router = drf_routers.SimpleRouter(trailing_slash=False)
api_router.register(r"music", MusicViewSet, basename="music")
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
api_router.register(r"conversations", ConversationViewSet, basename="conversation")
api_router.register(r"chats/messages", MessageViewSet, basename="message")
api_router.register(r"video-reports", VideoReportViewSet, basename="video-report")
api_router.register(
    r"support-tickets", UserSupportTicketViewSet, basename="support-ticket"
)
api_router.register(
    r"moderator/support-tickets",
    ModeratorSupportTicketViewSet,
    basename="moderator-support-ticket",
)
api_router.register(
    r"moderator/user-preferences",
    ModeratorUserPreferenceViewSet,
    basename="moderator-user-preference",
)
api_router.register(
    r"moderator/users",
    ModeratorUserViewSet,
    basename="moderator-user",
)

# Add api router urls
urlpatterns = []
urlpatterns += api_router.urls
