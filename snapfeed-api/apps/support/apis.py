from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.reports.permissions import IsModerator
from apps.support.models import SupportTicket
from apps.support.serializers import SupportTicketSerializer
from apps.support.services.support_services import process_support_ticket_update
from core.apis import BaseAPIViewSet


@extend_schema(tags=["support"])
class UserSupportTicketViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    BaseAPIViewSet,
):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            SupportTicket.objects.select_related("user", "handled_by")
            .filter(user=self.request.user)
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        from apps.support.models import SupportTicketReply

        ticket = self.get_object()
        content = request.data.get("reply_content")
        if not content:
            return self.response_error("Nội dung phản hồi không được để trống")

        SupportTicketReply.objects.create(
            ticket=ticket, sender=request.user, content=content
        )

        serializer = self.get_serializer(ticket)
        return Response(serializer.data)


@extend_schema(tags=["moderator-support"])
class ModeratorSupportTicketViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    BaseAPIViewSet,
):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsModerator]

    def get_queryset(self):
        return (
            SupportTicket.objects.select_related("user", "handled_by")
            .all()
            .order_by("-created_at")
        )

    def perform_update(self, serializer):
        reply_content = self.request.data.get("reply_content")
        status_val = self.request.data.get("status", serializer.instance.status)

        process_support_ticket_update(
            ticket=serializer.instance,
            reply_content=reply_content,
            status_val=status_val,
            moderator=self.request.user,
        )
