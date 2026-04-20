from core.enum_choices import EnumChoices


class ConversationType(EnumChoices):
    DIRECT = "direct"
    GROUP = "group"
    SELF = "self"


CHAT_USER_INBOX_GROUP_PREFIX = "chats.user_inbox"
