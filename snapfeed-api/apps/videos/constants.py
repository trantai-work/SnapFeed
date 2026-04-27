from core.enum_choices import EnumChoices


class Reactions(EnumChoices):
    LIKE = "like"
    LOVE = "love"
    HAHA = "haha"
    WOW = "wow"
    SAD = "sad"
    ANGRY = "angry"


class VideoStatus(EnumChoices):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


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

# Video search (Elasticsearch) pagination
VIDEO_SEARCH_DEFAULT_SIZE = 20
VIDEO_SEARCH_MAX_SIZE = 50

DEFAULT_TAGS: list[str] = [
    "music",
    "dance",
    "funny",
    "gaming",
    "food",
    "travel",
    "fitness",
    "beauty",
    "fashion",
    "sports",
    "pets",
    "news",
    "education",
    "technology",
    "lifestyle",
    "art",
    "vlog",
    "review",
    "meme",
    "cinema",
    "motivation",
    "daily",
    "comedy",
    "streetfood",
    "nature",
    "selfcare",
    "makeup",
    "outfit",
    "football",
    "cats",
    "dogs",
    "breakingnews",
    "study",
    "ai",
    "home",
    "drawing",
    "shortfilm",
    "unboxing",
    "reaction",
    "behindthescenes",
]

DEFAULT_VIDEO_DESCRIPTIONS: list[str] = [
    "Một ngày bình thường nhưng vui hơn chút.",
    "Chia sẻ khoảnh khắc nhỏ xíu của mình.",
    "Bạn thấy đoạn này có giống bạn không?",
    "Thử trend mới xem sao.",
    "Đừng quên thả tim nếu bạn thích.",
    "Chỉ là một chiếc vlog ngắn.",
    "Hôm nay mood như thế này.",
    "Cười cái cho đời bớt mệt.",
    "Có ai cùng sở thích không?",
    "Âm thanh này cuốn thật.",
    "Góc nhìn nhanh trong 10 giây.",
    "Kể bạn nghe chuyện này nè.",
    "Tập tành một chút mỗi ngày.",
    "Đi đâu đó cho đổi gió.",
    "Món này phải thử một lần.",
    "Chốt lại là… quá đã.",
    "Một chút nghệ thuật cho ngày mới.",
    "Đoạn này xem tới cuối nha.",
    "Bạn chấm mấy điểm?",
    "Đơn giản vậy thôi.",
    "Không có gì đặc biệt, chỉ là mình muốn đăng.",
    "Đoạn này tự nhiên thấy hay nên lưu lại.",
    "Thử làm một chút khác biệt xem sao.",
    "Ai xem tới đây chắc hợp vibe rồi đó.",
    "Ghi lại chút năng lượng tích cực.",
    "Lúc quay không nghĩ là sẽ vui vậy luôn.",
    "Nhẹ nhàng thôi nhưng cũng đủ chill.",
    "Một khoảnh khắc mình khá thích.",
    "Đơn giản nhưng mình thấy ổn áp.",
    "Không edit nhiều, giữ nguyên cảm xúc.",
    "Thấy hay hay nên share liền.",
    "Một phiên bản khác của mình hôm nay.",
    "Nhìn vậy thôi chứ cũng mất công lắm đó.",
    "Chỉ cần vậy là đủ vui rồi.",
    "Bạn có bao giờ như này chưa?",
    "Quay vội nhưng lại khá ưng.",
    "Tự nhiên thấy đáng yêu nên đăng.",
    "Một chút random trong ngày.",
    "Mood hôm nay: khá ổn.",
    "Không biết nói gì, xem là hiểu 😆",
]

DEFAULT_VIDEO_TITLES: list[str] = [
    "Chill một chút",
    "Khoảnh khắc hôm nay",
    "Vlog ngắn",
    "Một chút vui vui",
    "Thử trend",
    "Góc nhỏ của mình",
    "10 giây thôi",
    "Mood hôm nay",
    "Đi đâu đó",
    "Món ngon nè",
    "Tập tành",
    "Behind the scenes",
    "Một ngày bình thường",
    "Cute moment",
    "Quick update",
    "Hôm nay có gì?",
    "Cười lên nào",
    "Đừng bỏ lỡ",
    "Xem tới cuối nha",
    "Random",
]
