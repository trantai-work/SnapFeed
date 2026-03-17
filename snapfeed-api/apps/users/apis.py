from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action

from apps.users.models import User
from apps.users.serializers import UserSerializer
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
        serializer = self.get_serializer(user)
        return self.response_ok(serializer.data)
