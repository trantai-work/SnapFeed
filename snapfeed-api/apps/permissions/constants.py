from core.enum_choices import EnumChoices


class Groups(EnumChoices):
    ADMIN = "admin"
    MEMBER = "member"


GROUP_PERMISSIONS_MAP = {
    Groups.MEMBER.value: [
        "videos.add_video",
        "videos.delete_video",
        "videos.generate_presigned_url",
        "videos.react_video",
        "videos.view_video",
        "notifications.view_notificationrecipient",
        "notifications.change_notificationrecipient",
        "comments.view_videocomment",
        "comments.add_videocomment",
        "chats.view_conversation",
        "chats.add_conversation",
        "chats.view_message",
        "chats.add_message",
    ],
    Groups.ADMIN.value: [],
}
