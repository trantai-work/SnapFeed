import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { DEFAULT_REACTION, REACTION_TYPES, getReactionMeta } from "../constants/reactions";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { formatCount } from "../utils/format";

const HOVER_PICKER_QUERY = "(min-width: 1024px) and (hover: hover)";
const LONG_PRESS_MS = 520;
const MOVE_CANCEL_PX = 12;
const HOVER_OPEN_MS = 350;
const HOVER_LEAVE_MS = 180;

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function CommentReactButton({
  myReaction,
  reactionCount = 0,
  disabled = false,
  onReact,
  onRequireAuth,
}) {
  const isHoverPickerMode = useMediaQuery(HOVER_PICKER_QUERY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const longPressFired = useRef(false);
  const timerRef = useRef(null);
  const hoverOpenTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenTimerRef.current != null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  }, []);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      clearHoverOpenTimer();
      clearLeaveTimer();
    };
  }, [clearHoverOpenTimer, clearLeaveTimer, clearTimer]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    const onDocDown = (e) => {
      if (e.target?.closest?.("[data-comment-react-root]")) return;
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

  const runReact = useCallback(
    async (reaction) => {
      if (disabled) return;
      if (typeof onReact !== "function") return;
      try {
        await onReact(reaction);
      } finally {
        setPickerOpen(false);
      }
    },
    [disabled, onReact]
  );

  const quickReaction = myReaction ?? DEFAULT_REACTION;
  const meta = getReactionMeta(myReaction);

  const onHoverEnter = useCallback(() => {
    if (!isHoverPickerMode || disabled) return;
    clearLeaveTimer();
    clearHoverOpenTimer();
    hoverOpenTimerRef.current = window.setTimeout(() => {
      setPickerOpen(true);
      hoverOpenTimerRef.current = null;
    }, HOVER_OPEN_MS);
  }, [clearHoverOpenTimer, clearLeaveTimer, disabled, isHoverPickerMode]);

  const onHoverLeave = useCallback(() => {
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
    runReact(quickReaction);
  }, [clearTimer, disabled, onRequireAuth, quickReaction, runReact]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const btnClass =
    "inline-flex cursor-pointer items-center gap-2 rounded-full " +
    "bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-900 " +
    "hover:bg-zinc-200 active:bg-zinc-300 " +
    "dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:active:bg-white/20";

  const pickerClass =
    "absolute left-0 top-full z-[60] mt-2 flex max-w-[min(calc(100vw-3rem),22rem)] " +
    "flex-row flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl border " +
    "border-zinc-200/90 bg-white px-2 py-2 shadow-xl " +
    "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
    "dark:border-white/15 dark:bg-black/90 dark:backdrop-blur-md";

  const pickerItemClass =
    "flex min-h-[2.6rem] min-w-[2.6rem] shrink-0 cursor-pointer items-center justify-center " +
    "rounded-xl text-[1.35rem] transition-transform duration-150 ease-out " +
    "hover:scale-110 hover:bg-zinc-100 active:scale-95 dark:hover:bg-white/10";

  return (
    <div
      className="relative inline-flex items-center"
      data-comment-react-root
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <button
        type="button"
        className={btnClass}
        aria-label="Cảm xúc"
        aria-expanded={pickerOpen}
        aria-haspopup="menu"
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-1.5">
          {meta ? (
            <span className="text-[1.05rem]" aria-hidden>
              {meta.emoji}
            </span>
          ) : (
            <Heart className="h-4 w-4" strokeWidth={2} aria-hidden />
          )}
        </span>
        <span className="ml-1 text-zinc-500 dark:text-white/60">|</span>
        <span className="text-zinc-700 dark:text-white/80">
          {formatCount(reactionCount)}
        </span>
      </button>

      {pickerOpen ? (
        <div className={pickerClass} role="menu" aria-label="Chọn cảm xúc">
          {REACTION_TYPES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={classNames(
                pickerItemClass,
                myReaction === r.value ? "bg-zinc-100 dark:bg-white/10" : ""
              )}
              onClick={(e) => {
                e.stopPropagation();
                runReact(r.value);
              }}
              aria-label={r.label}
              title={r.label}
            >
              <span aria-hidden>{r.emoji}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

