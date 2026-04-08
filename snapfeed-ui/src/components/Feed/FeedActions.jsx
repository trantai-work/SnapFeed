import { memo } from "react";
import {
  Bookmark,
  MessageCircle,
  Share2,
  User,
} from "lucide-react";
import { FeedReactionButton } from "./FeedReactionButton";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function FeedActionsComponent({
  reactionLabel,
  commentLabel,
  saveLabel,
  shareLabel,
  avatarUrl,
  myReaction,
  reactDisabled = false,
  onReact,
  onComment,
  onSave,
  onShare,
  onRequireAuth,
  overlay = false,
  className = "",
}) {
  const actionBtn = overlay
    ? "flex cursor-pointer flex-col items-center gap-1.5 text-white transition-transform active:scale-95"
    : "flex cursor-pointer flex-col items-center gap-1.5 text-zinc-900 transition-transform hover:scale-105 active:scale-95 dark:text-white";

  const iconWrap = overlay
    ? "flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-[2px] transition-colors active:bg-black/50 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem] lg:h-12 lg:w-12"
    : "flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300/90 transition-colors hover:bg-zinc-50 hover:ring-zinc-400/80 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-0 dark:hover:bg-white/20";

  const labelClass = overlay
    ? "max-w-[3.5rem] truncate text-center text-[0.65rem] leading-tight text-white/95 drop-shadow sm:max-w-[4.25rem] sm:text-[0.7rem]"
    : "max-w-10 truncate text-center text-[0.6rem] leading-tight sm:max-w-[4.25rem] sm:text-[0.65rem]";

  const shareLabelClass = overlay
    ? "text-center text-[0.65rem] leading-tight text-white/95 drop-shadow sm:text-[0.7rem]"
    : "text-center text-[0.6rem] leading-tight sm:text-[0.65rem]";

  const avatarRing = overlay
    ? "ring-2 ring-white/50"
    : "ring-2 ring-zinc-300 dark:ring-white/30 dark:hover:ring-white/50";

  const overlayIconClass = overlay
    ? "h-6 w-6 sm:h-7 sm:w-7"
    : "h-6 w-6 sm:h-7 sm:w-7";

  const asideClass = overlay
    ? classNames(
        "pointer-events-auto absolute right-2 z-20 flex w-max min-w-[3rem] flex-col items-center justify-center gap-2.5 overflow-visible px-0.5 py-1 max-lg:top-1/2 max-lg:bottom-auto max-lg:left-auto max-lg:max-h-[min(72dvh,calc(100%-2rem))] max-lg:-translate-y-1/2 max-lg:origin-center sm:right-3 sm:gap-3 md:gap-3.5",
        className
      )
    : classNames(
        "hidden shrink-0 flex-col items-center justify-center gap-4 py-4 sm:gap-5 sm:py-6 lg:flex",
        "relative w-12 sm:w-[4.5rem] md:w-[4.75rem]",
        className
      );

  return (
    <aside className={asideClass} aria-label="Tương tác">
      <FeedReactionButton
        myReaction={myReaction}
        reactionLabel={reactionLabel}
        overlay={overlay}
        disabled={reactDisabled}
        onReact={onReact}
        onRequireAuth={onRequireAuth}
      />
      <button
        type="button"
        className={actionBtn}
        aria-label="Bình luận"
        onClick={() => {
          if (typeof onComment === "function") onComment();
          else if (typeof onRequireAuth === "function") onRequireAuth();
        }}
      >
        <span className={iconWrap}>
          <MessageCircle className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={labelClass}>{commentLabel}</span>
      </button>
      <button
        type="button"
        className={actionBtn}
        aria-label="Lưu"
        onClick={() => {
          if (typeof onSave === "function") onSave();
          else if (typeof onRequireAuth === "function") onRequireAuth();
        }}
      >
        <span className={iconWrap}>
          <Bookmark className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={labelClass}>{saveLabel}</span>
      </button>
      <button
        type="button"
        className={actionBtn}
        aria-label="Chia sẻ"
        onClick={() => {
          if (typeof onShare === "function") onShare();
          else if (typeof onRequireAuth === "function") onRequireAuth();
        }}
      >
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
                ? "h-11 w-11 overflow-hidden rounded-full transition sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]"
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
