from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework.decorators import action

from apps.chats.models import Message
from apps.chats.filters import MessageFilter
from apps.chats.pagination import ConversationPagination, MessagePagination
from apps.chats.serializers import (
    ConversationSerializer,
    DMSerializer,
    MarkReadSerializer,
    MessageSerializer,
)
from apps.chats.services import chat_services
from apps.chats.services.chat_realtime_services import push_message_created
from core.apis import BaseAPIViewSet
from core.permissions import FullDjangoModelPermissions


@extend_schema(tags=["conversations"])
class ConversationViewSet(
    mixins.ListModelMixin,
    BaseAPIViewSet,
):
    serializer_class = ConversationSerializer
    permission_classes = [FullDjangoModelPermissions]
    pagination_class = ConversationPagination

    def get_queryset(self):
        return chat_services.annotate_conversations_for_user(self.request.user).filter(
            last_message_at__isnull=False
        )

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = chat_services.get_conversation_unread_count(request.user)
        return self.response_ok({"count": count})

    @action(
        detail=False, methods=["post"], url_path="direct", serializer_class=DMSerializer
    )
    def direct(self, request):
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        other_user = serializer.validated_data["user"]

        conv = chat_services.get_or_create_direct_conversation(request.user, other_user)
        conv = chat_services.annotate_conversations_for_user(request.user).get(
            id=conv.id
        )
        return self.response_ok(ConversationSerializer(conv).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="read",
        serializer_class=MarkReadSerializer,
    )
    def read(self, request, pk=None):
        conv = self.get_object()
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        up_to = serializer.validated_data.get("up_to_message_id")

        read_at = chat_services.mark_read(
            conversation=conv,
            user=request.user,
            up_to_message_id=up_to,
            read_at=None,
        )
        return self.response_ok({"read_at": read_at})


@extend_schema(tags=["messages"])
class MessageViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    BaseAPIViewSet,
):
    serializer_class = MessageSerializer
    permission_classes = [FullDjangoModelPermissions]
    pagination_class = MessagePagination
    filterset_class = MessageFilter
    queryset = Message.objects.all()

    def get_queryset(self):
        return (
            Message.objects.filter(conversation__participants__user=self.request.user)
            .select_related("sender")
            .order_by("-id")
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        serializer = MessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        conv = serializer.validated_data["conversation"]
        content = serializer.validated_data["content"]

        chat_services.check_conversation_access(conv, request.user)

        msg = chat_services.create_message(
            conversation=conv, sender=request.user, content=content
        )
        push_message_created(msg)

        return self.response_created(MessageSerializer(msg).data)
