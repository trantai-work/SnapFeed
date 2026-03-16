from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.users.models import User
from apps.users.serializers import UserSerializer
from core.permissions import IsUserAuthenticated


@extend_schema(tags=["users"])
class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsUserAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserSerializer
