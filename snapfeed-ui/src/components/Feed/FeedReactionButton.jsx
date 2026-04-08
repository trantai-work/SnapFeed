import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import {
  DEFAULT_REACTION,
  REACTION_TYPES,
  getReactionMeta,
} from "../../constants/reactions";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;
const HOVER_OPEN_MS = 500;
const HOVER_LEAVE_MS = 200;

/** Desktop / coarse laptop: hover to open picker. Touch phones / tablets: long-press only. */
const HOVER_PICKER_QUERY = "(min-width: 1024px) and (hover: hover)";

function FeedReactionButtonComponent({
  myReaction,
  reactionLabel,
  overlay = false,
  disabled = false,
  onReact,
  onRequireAuth,
}) {
  const isHoverPickerMode = useMediaQuery(HOVER_PICKER_QUERY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconPop, setIconPop] = useState(false);
  const longPressFired = useRef(false);
  const timerRef = useRef(null);
  const hoverOpenTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });
  const iconPopTimerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenTimerRef.current != null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      clearHoverOpenTimer();
      clearLeaveTimer();
      if (iconPopTimerRef.current != null) {
        window.clearTimeout(iconPopTimerRef.current);
      }
    };
  }, [clearHoverOpenTimer, clearLeaveTimer, clearTimer]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    const onDocDown = (e) => {
      if (e.target?.closest?.("[data-feed-reaction-root]")) return;
      setPickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [pickerOpen]);

  const triggerIconPop = useCallback(() => {
    setIconPop(true);
    if (iconPopTimerRef.current != null) {
      window.clearTimeout(iconPopTimerRef.current);
    }
    iconPopTimerRef.current = window.setTimeout(() => {
      setIconPop(false);
      iconPopTimerRef.current = null;
    }, 480);
  }, []);

  /** Main control is icon-only <button>; label is a sibling (picker must not live inside <button> — nested buttons break clicks). */
  const iconOnlyBtn = overlay
    ? "inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-white transition-transform duration-200 will-change-transform active:scale-[0.97] disabled:cursor-not-allowed"
    : "inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-zinc-900 transition-transform duration-200 will-change-transform hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed dark:text-white";

  const iconWrap = overlay
    ? "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-[2px] transition-[transform,box-shadow] duration-200 ease-out active:bg-black/50 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem] lg:h-12 lg:w-12"
    : "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-300/90 transition-[transform,box-shadow] duration-200 ease-out hover:bg-zinc-50 hover:ring-zinc-400/80 active:shadow-md dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-0 dark:hover:bg-white/20";

  const labelClass = overlay
    ? "max-w-[3.5rem] truncate text-center text-[0.65rem] leading-tight text-white/95 drop-shadow sm:max-w-[4.25rem] sm:text-[0.7rem]"
    : "max-w-10 truncate text-center text-[0.6rem] leading-tight sm:max-w-[4.25rem] sm:text-[0.65rem]";

  const overlayIconClass = overlay
    ? "h-6 w-6 sm:h-7 sm:w-7"
    : "h-6 w-6 sm:h-7 sm:w-7";

  const meta = getReactionMeta(myReaction);

  const suppressClickRef = useRef(false);

  const runReact = useCallback(
    async (reaction) => {
      if (disabled || typeof onReact !== "function") return;
      try {
        await onReact(reaction);
      } finally {
        setPickerOpen(false);
      }
    },
    [disabled, onReact]
  );

  const reactionForQuickTap = myReaction ?? DEFAULT_REACTION;

  const onHoverZoneEnter = useCallback(() => {
    if (!isHoverPickerMode || disabled) return;
    clearLeaveTimer();
    clearHoverOpenTimer();
    hoverOpenTimerRef.current = window.setTimeout(() => {
      setPickerOpen(true);
      hoverOpenTimerRef.current = null;
    }, HOVER_OPEN_MS);
  }, [clearHoverOpenTimer, clearLeaveTimer, disabled, isHoverPickerMode]);

  const onHoverZoneLeave = useCallback(() => {
    if (!isHoverPickerMode) return;
    clearHoverOpenTimer();
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      setPickerOpen(false);
      leaveTimerRef.current = null;
    }, HOVER_LEAVE_MS);
  }, [clearHoverOpenTimer, clearLeaveTimer, isHoverPickerMode]);

  const onPointerDown = useCallback(
    (e) => {
      if (disabled) {
        onRequireAuth?.();
        return;
      }
      if (isHoverPickerMode) return;
      longPressFired.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        longPressFired.current = true;
        setPickerOpen(true);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(12);
        }
      }, LONG_PRESS_MS);
    },
    [clearTimer, disabled, isHoverPickerMode, onRequireAuth]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (isHoverPickerMode) return;
      const { x, y } = startRef.current;
      const d = Math.hypot(e.clientX - x, e.clientY - y);
      if (d > MOVE_CANCEL_PX) clearTimer();
    },
    [clearTimer, isHoverPickerMode]
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
    if (disabled) {
      onRequireAuth?.();
      return;
    }
    if (longPressFired.current) return;
    suppressClickRef.current = true;
    triggerIconPop();
    runReact(reactionForQuickTap);
  }, [
    clearTimer,
    disabled,
    onRequireAuth,
    reactionForQuickTap,
    runReact,
    triggerIconPop,
  ]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPick = useCallback(
    (value) => {
      triggerIconPop();
      runReact(value);
    },
    [runReact, triggerIconPop]
  );

  const pickerBarClass = overlay
    ? "feed-reaction-picker absolute right-full top-1/2 z-[60] mr-1.5 flex max-w-[min(calc(100vw-3rem),22rem)] -translate-y-1/2 flex-row flex-nowrap items-center gap-0.5 overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white px-1.5 py-1.5 shadow-xl [-ms-overflow-style:none] [scrollbar-width:none] sm:mr-2 sm:gap-1 sm:px-2 sm:py-2 [&::-webkit-scrollbar]:hidden dark:border-white/15 dark:bg-black/90 dark:backdrop-blur-md"
    : "feed-reaction-picker absolute right-full top-1/2 z-[60] mr-1.5 flex max-w-[min(calc(100vw-3rem),22rem)] -translate-y-1/2 flex-row flex-nowrap items-center gap-0.5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white px-1.5 py-1.5 shadow-xl [-ms-overflow-style:none] [scrollbar-width:none] dark:border-white/10 dark:bg-zinc-900 sm:mr-2 sm:gap-1 sm:px-2 sm:py-2 [&::-webkit-scrollbar]:hidden";

  const pickerItemClass = overlay
    ? "feed-reaction-picker-item flex min-h-[2.5rem] min-w-[2.5rem] shrink-0 cursor-pointer items-center justify-center rounded-xl text-[1.35rem] transition-transform duration-150 ease-out hover:scale-110 hover:bg-zinc-100 active:scale-95 sm:min-h-[2.75rem] sm:min-w-[2.75rem] sm:text-[1.45rem] md:text-[1.55rem] dark:hover:bg-white/10"
    : "feed-reaction-picker-item flex min-h-[2.5rem] min-w-[2.5rem] shrink-0 cursor-pointer items-center justify-center rounded-xl text-[1.35rem] transition-transform duration-150 ease-out hover:scale-110 hover:bg-zinc-100 active:scale-95 dark:hover:bg-white/10 sm:min-h-[2.75rem] sm:min-w-[2.75rem] sm:text-[1.45rem] md:text-[1.55rem]";

  return (
    <div
      className="flex flex-col items-center overflow-visible"
      data-feed-reaction-root
      onMouseEnter={onHoverZoneEnter}
      onMouseLeave={onHoverZoneLeave}
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative inline-flex shrink-0 items-center justify-center">
          <button
            type="button"
            className={iconOnlyBtn}
            aria-label="Cảm xúc"
            aria-expanded={pickerOpen}
            aria-haspopup="menu"
            disabled={disabled}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClick={(e) => {
              e.stopPropagation();
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                e.preventDefault();
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span
              className={`${iconWrap} ${iconPop ? "feed-reaction-icon-pop" : ""}`}
            >
              {meta ? (
                <span
                  className={`flex select-none items-center justify-center text-[1.35rem] leading-none transition-transform duration-200 sm:text-[1.5rem] md:text-[1.6rem] ${myReaction === "love" ? "drop-shadow-sm" : ""}`}
                  aria-hidden
                >
                  {meta.emoji}
                </span>
              ) : (
                <Heart className={overlayIconClass} strokeWidth={1.75} fill="none" />
              )}
            </span>
          </button>

          {pickerOpen ? (
            <div className={pickerBarClass} role="menu" aria-label="Chọn cảm xúc">
              {REACTION_TYPES.map(({ value, emoji, label }, index) => (
                <button
                  key={value}
                  type="button"
                  role="menuitem"
                  style={{ animationDelay: `${index * 28}ms` }}
                  className={pickerItemClass}
                  aria-label={label}
                  aria-current={myReaction === value ? true : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPick(value);
                  }}
                >
                  <span aria-hidden>{emoji}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className={labelClass}>{reactionLabel}</span>
      </div>
    </div>
  );
}

export const FeedReactionButton = memo(FeedReactionButtonComponent);
