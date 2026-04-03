from core.enum_choices import EnumChoices


class Reactions(EnumChoices):
    LIKE = "like"
    LOVE = "love"
    HAHA = "haha"
    WOW = "wow"
    SAD = "sad"
    ANGRY = "angry"


class AllowedVideoContentTypes(EnumChoices):
    mp4 = "video/mp4"
    mov = "video/quicktime"


MAX_VIDEO_UPLOAD_SIZE = 3 * 1024 * 1024 * 1024  # 3GB
