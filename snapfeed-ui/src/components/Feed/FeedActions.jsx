import { memo } from "react";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  User,
} from "lucide-react";

const actionBtn =
  "flex cursor-pointer flex-col items-center gap-1.5 text-white transition-transform hover:scale-105 active:scale-95";
const iconWrap =
  "flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20";

function FeedActionsComponent({
  reactionLabel,
  commentLabel,
  saveLabel,
  shareLabel,
  avatarUrl,
}) {
  return (
    <aside
      className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center gap-5 py-6 sm:w-[4.5rem]"
      aria-label="Tương tác"
    >
      <button type="button" className={actionBtn} aria-label="Thả tim">
        <span className={iconWrap}>
          <Heart className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span className="max-w-[4.25rem] truncate text-center text-[0.65rem] leading-tight">
          {reactionLabel}
        </span>
      </button>
      <button type="button" className={actionBtn} aria-label="Bình luận">
        <span className={iconWrap}>
          <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span className="max-w-[4.25rem] truncate text-center text-[0.65rem] leading-tight">
          {commentLabel}
        </span>
      </button>
      <button type="button" className={actionBtn} aria-label="Lưu">
        <span className={iconWrap}>
          <Bookmark className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span className="max-w-[4.25rem] truncate text-center text-[0.65rem] leading-tight">
          {saveLabel}
        </span>
      </button>
      <button type="button" className={actionBtn} aria-label="Chia sẻ">
        <span className={iconWrap}>
          <Share2 className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span className="text-center text-[0.65rem] leading-tight">
          {shareLabel}
        </span>
      </button>
      <button type="button" className={actionBtn} aria-label="Hồ sơ người đăng">
        {avatarUrl ? (
          <span className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/30 transition hover:ring-white/50">
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </span>
        ) : (
          <span className={iconWrap}>
            <User className="h-7 w-7" strokeWidth={1.75} />
          </span>
        )}
      </button>
    </aside>
  );
}

export const FeedActions = memo(FeedActionsComponent);
