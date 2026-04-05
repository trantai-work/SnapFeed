from drf_spectacular.utils import extend_schema
from rest_framework import mixins

from apps.notifications.models import NotificationRecipient
from apps.notifications.pagination import NotificationPagination
from apps.notifications.serializers import NotificationRecipientSerializer
from core.apis import BaseAPIViewSet
from core.permissions import FullDjangoModelPermissions


@extend_schema(tags=["notifications"])
class NotificationRecipientViewSet(mixins.ListModelMixin, BaseAPIViewSet):
    """
    List notifications for the authenticated user (via NotificationRecipient).
    """

    serializer_class = NotificationRecipientSerializer
    permission_classes = [FullDjangoModelPermissions]
    pagination_class = NotificationPagination

    def get_queryset(self):
        return (
            NotificationRecipient.objects.filter(user=self.request.user)
            .select_related(
                "notification",
                "notification__actor",
                "notification__target_content_type",
            )
            .order_by("-created_at", "-id")
        )
