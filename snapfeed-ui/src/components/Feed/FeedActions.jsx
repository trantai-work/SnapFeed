import { memo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Flag,
  MessageCircle,
  User,
  UserCheck,
  Share2,
} from "lucide-react";
import { FeedReactionButton } from "./FeedReactionButton";
import { usersApi } from "../../api/user.api";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function FeedActionsComponent({
  viewLabel,
  reactionLabel,
  commentLabel,
  avatarUrl,
  profileUserId,
  myReaction,
  reactDisabled = false,
  isFollowing = false,
  currentUserId = null,
  onReact,
  onComment,
  onReport,
  onShare,
  onRequireAuth,
  onFollowUpdate,
  overlay = false,
  className = "",
}) {
  const navigate = useNavigate();
  const [followState, setFollowState] = useState(isFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  // Sync followState with isFollowing prop
  useEffect(() => {
    setFollowState(isFollowing);
  }, [isFollowing]);

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!profileUserId || !currentUserId || profileUserId === currentUserId) return;
    if (followLoading) return;

    setFollowLoading(true);
    try {
      if (followState) {
        await usersApi.unfollow(profileUserId);
        setFollowState(false);
        onFollowUpdate?.(profileUserId, false);
      } else {
        await usersApi.follow(profileUserId);
        setFollowState(true);
        onFollowUpdate?.(profileUserId, true);
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const actionBtn = overlay
    ? "flex cursor-pointer flex-col items-center gap-1.5 text-white transition-transform active:scale-95"
    : "flex cursor-pointer flex-col items-center gap-1.5 text-zinc-900 transition-transform hover:scale-105 active:scale-95 dark:text-white";

  const iconWrap = overlay
    ? "flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-[2px] transition-colors active:bg-black/50 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem] lg:h-12 lg:w-12"
    : "flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300/90 transition-colors hover:bg-zinc-50 hover:ring-zinc-400/80 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-0 dark:hover:bg-white/20";

  const labelClass = overlay
    ? "max-w-[3.5rem] truncate text-center text-[0.65rem] leading-tight text-white/95 drop-shadow sm:max-w-[4.25rem] sm:text-[0.7rem]"
    : "max-w-10 truncate text-center text-[0.6rem] leading-tight sm:max-w-[4.25rem] sm:text-[0.65rem]";

  const statWrap = overlay
    ? "flex flex-col items-center gap-1.5 text-white/95 select-none"
    : "flex flex-col items-center gap-1.5 text-zinc-900/90 dark:text-white/90 select-none";

  const statIconWrap = overlay
    ? "flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-white ring-1 ring-white/15 backdrop-blur-[2px] sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem] lg:h-12 lg:w-12"
    : "flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-zinc-900 ring-1 ring-zinc-200/70 dark:bg-white/5 dark:text-white dark:ring-white/10";

  const statLabelClass = overlay
    ? "max-w-[3.5rem] truncate text-center text-[0.65rem] font-semibold leading-tight text-white/95 drop-shadow sm:max-w-[4.25rem] sm:text-[0.7rem]"
    : "max-w-10 truncate text-center text-[0.6rem] font-semibold leading-tight sm:max-w-[4.25rem] sm:text-[0.65rem]";

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
      {viewLabel ? (
        <div className={statWrap} aria-label="Lượt xem">
          <span className={statIconWrap} aria-hidden>
            <Eye className={overlayIconClass} strokeWidth={1.75} />
          </span>
          <span className={statLabelClass}>{viewLabel}</span>
        </div>
      ) : null}
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
        aria-label="Chia sẻ"
        onClick={() => {
          if (typeof onShare === "function") onShare();
          else if (typeof onRequireAuth === "function") onRequireAuth();
        }}
      >
        <span className={iconWrap}>
          <Share2 className={overlayIconClass} strokeWidth={1.75} />
        </span>
        <span className={labelClass}>Chia sẻ</span>
      </button>
      {profileUserId && currentUserId && profileUserId !== currentUserId ? (
        <button
          type="button"
          className={actionBtn}
          aria-label="Báo cáo video"
          onClick={() => {
            if (typeof onReport === "function") onReport();
            else if (typeof onRequireAuth === "function") onRequireAuth();
          }}
        >
          <span className={iconWrap}>
            <Flag className={overlayIconClass} strokeWidth={1.75} />
          </span>
          <span className={labelClass}>Báo cáo</span>
        </button>
      ) : null}
      <div className="relative">
        <button
          type="button"
          className={actionBtn}
          aria-label="Hồ sơ người đăng"
          onClick={() => {
            if (!profileUserId) return;
            navigate(`/profile/${profileUserId}`);
          }}
        >
          {avatarUrl ? (
            <span
              className={classNames(
                overlay
                  ? "block h-11 w-11 overflow-hidden rounded-full transition sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]"
                  : "block h-11 w-11 overflow-hidden rounded-full transition sm:h-12 sm:w-12",
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

        {profileUserId && currentUserId && profileUserId !== currentUserId && !followState && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFollow(e);
            }}
            disabled={followLoading}
            className={classNames(
              "absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full transition-all cursor-pointer",
              followState
                ? overlay
                  ? "bg-white text-blue-600 ring-2 ring-white/50"
                  : "bg-white text-blue-600 ring-2 ring-blue-300 dark:bg-blue-500/90 dark:text-white dark:ring-blue-400/50"
                : overlay
                ? "bg-pink-600 text-white ring-2 ring-white/50"
                : "bg-pink-600 text-white ring-2 ring-pink-400 dark:ring-pink-500/50",
              followLoading && "opacity-50 pointer-events-none",
              "hover:scale-110 active:scale-95"
            )}
            aria-label={followState ? "Bỏ theo dõi" : "Theo dõi"}
          >
            {followState ? (
              <UserCheck className="h-3 w-3" strokeWidth={3} />
            ) : (
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

export const FeedActions = memo(FeedActionsComponent);
