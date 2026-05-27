from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework.decorators import action

from apps.chats.models import Message
from apps.chats.constants import ConversationType
from apps.users.models import User
from apps.chats.filters import MessageFilter
from apps.chats.pagination import ConversationPagination, MessagePagination
from apps.chats.serializers import (
    AttachmentDownloadSerializer,
    AttachmentUploadSerializer,
    ConversationSerializer,
    DMSerializer,
    GroupSerializer,
    MarkReadSerializer,
    MessageSerializer,
)
from apps.chats.services import chat_services
from apps.chats.services.attachment_services import (
    generate_download_presigned_url,
    generate_upload_presigned_url,
)
from apps.chats.services.chat_realtime_services import push_message_created
from core.apis import BaseAPIViewSet
from core.messages import ERROR_MESSAGES
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
        detail=False,
        methods=["post"],
        url_path="group",
        serializer_class=GroupSerializer,
    )
    def group(self, request):
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data.get("title")
        participant_users = serializer.validated_data.get("user_ids", [])

        # Create group conversation
        conv = chat_services.create_group_conversation(
            creator=request.user,
            title=title,
            participant_users=participant_users,
        )

        # Send initial system message to make the group visible to everyone
        creator_name = (
            f"{request.user.first_name} {request.user.last_name}".strip()
            or request.user.username
        )
        sys_msg_text = f"{creator_name} đã tạo nhóm"
        if title:
            sys_msg_text += f' "{title}"'

        sys_msg = chat_services.create_message(
            conversation=conv,
            sender=request.user,
            content=sys_msg_text,
            is_system=True,
        )

        # Reload conversation with annotated fields (such as last_message_*)
        conv = chat_services.annotate_conversations_for_user(request.user).get(
            id=conv.id
        )

        # Notify other participants via WS message
        push_message_created(sys_msg)

        return self.response_created(ConversationSerializer(conv).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="add-members",
    )
    def add_members(self, request, pk=None):
        conv = self.get_object()
        if conv.type != ConversationType.GROUP.value:
            return self.response_bad_request(
                ERROR_MESSAGES["only_group_can_add_members"]
            )

        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            return self.response_bad_request(ERROR_MESSAGES["user_ids_required"])

        users = list(User.objects.filter(id__in=user_ids))
        if not users:
            return self.response_bad_request(ERROR_MESSAGES["no_valid_users_found"])

        new_participants = chat_services.add_participants_to_group(
            conversation=conv,
            users=users,
        )

        if new_participants:
            user_names = [
                f"{u.first_name} {u.last_name}".strip() or u.username for u in users
            ]
            added_names_str = ", ".join(user_names)
            creator_name = (
                f"{request.user.first_name} {request.user.last_name}".strip()
                or request.user.username
            )
            sys_msg_text = f"{creator_name} đã thêm {added_names_str} vào nhóm"

            sys_msg = chat_services.create_message(
                conversation=conv,
                sender=request.user,
                content=sys_msg_text,
                is_system=True,
            )

            push_message_created(sys_msg)

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
            .select_related("sender", "shared_video", "shared_video__user")
            .order_by("-id")
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        serializer = MessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        conv = serializer.validated_data["conversation"]
        chat_services.check_conversation_access(conv, request.user)

        msg = chat_services.create_message(
            conversation=conv,
            sender=request.user,
            content=serializer.validated_data.get("content"),
            attachment_key=serializer.validated_data.get("attachment_key"),
            attachment_name=serializer.validated_data.get("attachment_name"),
            attachment_size=serializer.validated_data.get("attachment_size"),
            attachment_type=serializer.validated_data.get("attachment_type"),
            shared_video=serializer.validated_data.get("shared_video"),
        )
        # Refresh or fetch with prefetched/selected fields to make serialization of shared_video efficient
        # and prevent N+1 queries.
        msg = Message.objects.select_related(
            "sender", "shared_video", "shared_video__user"
        ).get(id=msg.id)
        push_message_created(msg)

        return self.response_created(
            MessageSerializer(msg, context={"request": request}).data
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="attachment/presigned-upload",
        serializer_class=AttachmentUploadSerializer,
    )
    def attachment_presigned_upload(self, request):
        """
        Generate a presigned POST URL for uploading a chat attachment.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conv = serializer.validated_data["conversation"]
        chat_services.check_conversation_access(conv, request.user)

        result = generate_upload_presigned_url(
            user_id=request.user.id,
            conversation_id=conv.id,
            file_name=serializer.validated_data["file_name"],
            content_type=serializer.validated_data["content_type"],
        )
        return self.response_ok(result)

    @action(
        detail=False,
        methods=["get"],
        url_path="attachment/presigned-download",
        serializer_class=AttachmentDownloadSerializer,
    )
    def attachment_presigned_download(self, request):
        """
        Generate a presigned GET URL for downloading a chat attachment.
        """

        serializer = self.get_serializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        url = generate_download_presigned_url(
            user=request.user,
            s3_key=serializer.validated_data["key"],
            download_filename=serializer.validated_data.get("filename"),
        )
        return self.response_ok({"url": url})
