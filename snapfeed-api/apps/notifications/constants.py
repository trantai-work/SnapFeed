from core.enum_choices import EnumChoices


class NotificationCategory(EnumChoices):
    """
    Used for filtering in-app notifications (e.g. video reactions, comments).
    """

    REACT = "react"
    COMMENT = "comment"
    SYSTEM = "system"


REACT_VIDEO_NOTIFICATION_TITLE = "Tương tác mới trên video"
REACT_VIDEO_NOTIFICATION_MESSAGE_TEMPLATE = (
    "{first_name} {last_name} đã thả {reaction_label} vào video của bạn."
)

COMMENT_VIDEO_NOTIFICATION_TITLE = "Bình luận mới trên video"
COMMENT_VIDEO_NOTIFICATION_MESSAGE_TEMPLATE = (
    "{first_name} {last_name} đã bình luận trên video của bạn."
)
