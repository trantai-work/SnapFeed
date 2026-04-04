import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function FeedNavigationComponent({
  canScrollUp,
  canScrollDown,
  onPrev,
  onNext,
}) {
  const navBtnBase =
    "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-gray-300/90 bg-white/90 text-gray-800 shadow-lg backdrop-blur-sm transition dark:border-white/15 dark:bg-black/55 dark:text-white sm:h-12 sm:w-12";
  const navBtnEnabled =
    "cursor-pointer hover:scale-105 hover:bg-gray-100 active:scale-95 dark:hover:bg-black/75";
  const navBtnDisabled = "cursor-not-allowed opacity-35";

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-11 flex-col items-center justify-center gap-2 pl-0.5 sm:w-14 sm:gap-3 sm:pl-1 lg:flex lg:flex-col">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canScrollUp}
        className={`${navBtnBase} ${canScrollUp ? navBtnEnabled : navBtnDisabled}`}
        aria-label="Video trước"
      >
        <ChevronUp className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canScrollDown}
        className={`${navBtnBase} ${canScrollDown ? navBtnEnabled : navBtnDisabled}`}
        aria-label="Video sau"
      >
        <ChevronDown className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
      </button>
    </div>
  );
}

export const FeedNavigation = memo(FeedNavigationComponent);
