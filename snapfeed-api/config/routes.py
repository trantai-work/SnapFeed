from rest_framework import routers as drf_routers

api_router = drf_routers.SimpleRouter(trailing_slash=False)

# Add api router urls
urlpatterns = []
urlpatterns += api_router.urls
