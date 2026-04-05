from core.enum_choices import EnumChoices


class Reactions(EnumChoices):
    LIKE = "like"
    LOVE = "love"
    HAHA = "haha"
    WOW = "wow"
    SAD = "sad"
    ANGRY = "angry"


REACT_VIDEO_DEFAULT_LABEL = "👍"

REACT_VIDEO_LABELS_MAP: dict[str, str] = {
    Reactions.LIKE.value: "👍",
    Reactions.LOVE.value: "❤️",
    Reactions.HAHA.value: "😂",
    Reactions.WOW.value: "😮",
    Reactions.SAD.value: "😢",
    Reactions.ANGRY.value: "😠",
}


class AllowedVideoContentTypes(EnumChoices):
    mp4 = "video/mp4"
    mov = "video/quicktime"


MAX_VIDEO_UPLOAD_SIZE = 3 * 1024 * 1024 * 1024  # 3GB
