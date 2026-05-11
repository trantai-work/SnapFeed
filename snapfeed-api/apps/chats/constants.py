from core.enum_choices import EnumChoices


class ConversationType(EnumChoices):
    DIRECT = "direct"
    GROUP = "group"
    SELF = "self"


CHAT_USER_INBOX_GROUP_PREFIX = "chats.user_inbox"

CHAT_ATTACHMENT_PREFIX = "chat-attachments"
MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024  # 50MB
PRESIGNED_UPLOAD_EXPIRY = 3600  # 1 hour
PRESIGNED_DOWNLOAD_EXPIRY = 300  # 5 minutes

IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
}
