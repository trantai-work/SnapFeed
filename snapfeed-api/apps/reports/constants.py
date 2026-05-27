from core.enum_choices import EnumChoices


class VideoReportReason(EnumChoices):
    SPAM = "spam"
    VIOLENCE = "violence"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    NUDITY = "nudity"
    COPYRIGHT = "copyright"
    MISINFORMATION = "misinformation"
    OTHER = "other"


class ReportStatus(EnumChoices):
    PENDING = "pending"
    DISMISSED = "dismissed"
    ACTION_TAKEN = "action_taken"


VIDEO_HIDDEN_NOTIFICATION_TITLE = "Video đã bị gỡ"
VIDEO_RESTORED_NOTIFICATION_TITLE = "Video đã được khôi phục"
