from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from apps.music.models import Music
from apps.music.serializers import MusicSerializer
from core.apis import BaseAPIViewSet
from core.permissions import FullDjangoModelPermissions


@extend_schema(tags=["music"])
class MusicViewSet(
    viewsets.ModelViewSet,
    BaseAPIViewSet,
):
    serializer_class = MusicSerializer
    permission_classes = [FullDjangoModelPermissions]
    filter_backends = [SearchFilter]
    search_fields = ["title", "artist"]

    def get_queryset(self):
        user = self.request.user
        # If user has permission to add music (admin/moderator), return all tracks
        if user.is_authenticated and (
            user.is_superuser or user.has_perm("music.add_music")
        ):
            return Music.objects.all().order_by("-created_at")
        # Otherwise, regular users can only see active tracks
        return Music.objects.filter(is_active=True).order_by("-created_at")
