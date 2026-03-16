from rest_framework import routers as drf_routers

from apps.oauth.apis import OAuthViewSet
from apps.users.apis import UserViewSet

api_router = drf_routers.SimpleRouter(trailing_slash=False)
api_router.register(r"auth", OAuthViewSet, basename="auth")
api_router.register(r"users", UserViewSet, basename="user")

# Add api router urls
urlpatterns = []
urlpatterns += api_router.urls
