from core.enum_choices import EnumChoices


class Groups(EnumChoices):
    ADMIN = "admin"
    MEMBER = "member"


GROUP_PERMISSIONS_MAP = {
    Groups.MEMBER.value: [],
    Groups.ADMIN.value: [
        # "auth.view_group"
    ],
}
