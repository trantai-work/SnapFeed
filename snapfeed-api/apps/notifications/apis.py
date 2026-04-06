from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status
from rest_framework.decorators import action

from apps.notifications.models import NotificationRecipient
from apps.notifications.pagination import NotificationPagination
from apps.notifications.permissions import ChangeNotificationRecipientPermission
from apps.notifications.serializers import NotificationRecipientSerializer
from apps.notifications.services import notification_services
from core.apis import BaseAPIViewSet
from core.messages import ERROR_MESSAGES
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

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = notification_services.get_unread_count(user=request.user)
        return self.response_ok({"count": count})

    @action(
        detail=True,
        methods=["patch"],
        url_path="read",
        permission_classes=[ChangeNotificationRecipientPermission],
    )
    def mark_read(self, request, pk=None):
        row = self.get_queryset().filter(pk=pk).first()
        if not row:
            return self.response_error(
                ERROR_MESSAGES["notification_not_found"],
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if not row.is_read:
            notification_services.mark_read(row)
        serializer = self.get_serializer(row)
        return self.response_ok(serializer.data)
