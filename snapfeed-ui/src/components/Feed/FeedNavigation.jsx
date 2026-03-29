import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function FeedNavigationComponent({
  canScrollUp,
  canScrollDown,
  onPrev,
  onNext,
}) {
  const navBtnBase =
    "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-sm transition";
  const navBtnEnabled =
    "cursor-pointer hover:scale-105 hover:bg-black/75 active:scale-95";
  const navBtnDisabled = "cursor-not-allowed opacity-35";

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-14 flex-col items-center justify-center gap-3 pl-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canScrollUp}
        className={`${navBtnBase} ${canScrollUp ? navBtnEnabled : navBtnDisabled}`}
        aria-label="Video trước"
      >
        <ChevronUp className="h-7 w-7" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canScrollDown}
        className={`${navBtnBase} ${canScrollDown ? navBtnEnabled : navBtnDisabled}`}
        aria-label="Video sau"
      >
        <ChevronDown className="h-7 w-7" strokeWidth={2} />
      </button>
    </div>
  );
}

export const FeedNavigation = memo(FeedNavigationComponent);
