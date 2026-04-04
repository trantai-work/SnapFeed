import { memo } from "react";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  User,
} from "lucide-react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function FeedActionsComponent({
  reactionLabel,
  commentLabel,
  saveLabel,
  shareLabel,
  avatarUrl,
  overlay = false,
  className = "",
}) {
  const actionBtn = overlay
    ? "flex cursor-pointer flex-col items-center gap-1.5 text-white transition-transform active:scale-95"
    : "flex cursor-pointer flex-col items-center gap-1.5 text-zinc-900 transition-transform hover:scale-105 active:scale-95 dark:text-white";

  const iconWrap = overlay
    ? "flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-[2px] transition-colors active:bg-black/50 max-lg:[@media(max-height:640px)]:h-8 max-lg:[@media(max-height:640px)]:w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 lg:h-12 lg:w-12"
    : "flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300/90 transition-colors hover:bg-zinc-50 hover:ring-zinc-400/80 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-0 dark:hover:bg-white/20";

  const labelClass = overlay
    ? "max-w-[3.25rem] truncate text-center text-[0.6rem] leading-tight text-white/95 drop-shadow sm:max-w-[4.25rem] sm:text-[0.65rem]"
    : "max-w-10 truncate text-center text-[0.6rem] leading-tight sm:max-w-[4.25rem] sm:text-[0.65rem]";

  const shareLabelClass = overlay
    ? "text-center text-[0.6rem] leading-tight text-white/95 drop-shadow sm:text-[0.65rem]"
    : "text-center text-[0.6rem] leading-tight sm:text-[0.65rem]";

  const avatarRing = overlay
    ? "ring-2 ring-white/50"
    : "ring-2 ring-zinc-300 dark:ring-white/30 dark:hover:ring-white/50";

  const overlayIconClass = overlay
    ? "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7"
    : "h-6 w-6 sm:h-7 sm:w-7";

  const asideClass = overlay
    ? classNames(
        "pointer-events-auto absolute right-1.5 z-20 flex w-auto max-w-[3.25rem] flex-col items-center justify-center gap-2 overflow-y-auto overflow-x-visible overscroll-contain py-0.5 max-lg:bottom-[max(5rem,env(safe-area-inset-bottom,0px))] max-lg:left-auto max-lg:max-h-[min(58svh,calc(100svh-9rem))] max-lg:top-[max(3.5rem,env(safe-area-inset-top,0px))] max-lg:origin-[center_right] max-lg:[@media(max-height:700px)]:scale-[0.92] max-lg:[@media(max-height:600px)]:scale-[0.85] max-lg:[@media(max-height:500px)]:scale-[0.78] max-lg:[@media(max-width:400px)]:scale-[0.94] sm:right-2 sm:gap-2.5 sm:max-w-none md:gap-3",
        className
      )
    : classNames(
        "hidden shrink-0 flex-col items-center justify-center gap-4 py-4 sm:gap-5 sm:py-6 lg:flex",
        "relative w-12 sm:w-[4.5rem] md:w-[4.75rem]",
        className
      );

  return (
    <aside className={asideClass} aria-label="Tương tác">
      <button type="button" className={actionBtn} aria-label="Thả tim">
        <span className={iconWrap}>
          <Heart className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={labelClass}>{reactionLabel}</span>
      </button>
      <button type="button" className={actionBtn} aria-label="Bình luận">
        <span className={iconWrap}>
          <MessageCircle className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={labelClass}>{commentLabel}</span>
      </button>
      <button type="button" className={actionBtn} aria-label="Lưu">
        <span className={iconWrap}>
          <Bookmark className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={labelClass}>{saveLabel}</span>
      </button>
      <button type="button" className={actionBtn} aria-label="Chia sẻ">
        <span className={iconWrap}>
          <Share2 className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={shareLabelClass}>{shareLabel}</span>
      </button>
      <button type="button" className={actionBtn} aria-label="Hồ sơ người đăng">
        {avatarUrl ? (
          <span
            className={classNames(
              overlay
                ? "h-9 w-9 overflow-hidden rounded-full transition max-lg:[@media(max-height:640px)]:h-8 max-lg:[@media(max-height:640px)]:w-8 sm:h-10 sm:w-10 md:h-11 md:w-11"
                : "h-11 w-11 overflow-hidden rounded-full transition sm:h-12 sm:w-12",
              avatarRing
            )}
          >
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </span>
        ) : (
          <span className={iconWrap}>
            <User className={overlayIconClass} strokeWidth={1.75} />
          </span>
        )}
      </button>
    </aside>
  );
}

export const FeedActions = memo(FeedActionsComponent);
