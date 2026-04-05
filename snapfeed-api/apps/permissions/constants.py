from core.enum_choices import EnumChoices


class Groups(EnumChoices):
    ADMIN = "admin"
    MEMBER = "member"


GROUP_PERMISSIONS_MAP = {
    Groups.MEMBER.value: [
        "videos.add_video",
        "videos.generate_presigned_url",
        "videos.react_video",
        "notifications.view_notificationrecipient",
    ],
    Groups.ADMIN.value: [],
}
