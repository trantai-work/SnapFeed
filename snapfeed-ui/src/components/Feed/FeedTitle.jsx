import { useEffect, useState } from "react";
import { LONG_TITLE_CHARS } from "./feedConstants";

const expandedPanelClass =
  "max-h-24 overflow-y-auto overscroll-contain rounded-lg border border-white/15 " +
  "bg-gradient-to-b from-white/[0.06] via-black/20 to-black/40 px-2.5 py-1.5 text-sm leading-snug " +
  "text-white/95 shadow-lg shadow-black/25 backdrop-blur-xl " +
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function FeedTitle({ text, videoItemId }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [videoItemId]);

  if (!text) return null;

  const isLong = text.length > LONG_TITLE_CHARS;

  if (!isLong) {
    return (
      <p className="mt-0.5 text-sm font-extrabold text-white drop-shadow">{text}</p>
    );
  }

  if (!expanded) {
    return (
      <div className="pointer-events-auto mt-0.5 max-w-full">
        <p className="line-clamp-1 text-sm font-extrabold text-white drop-shadow">{text}</p>
        <button
          type="button"
          className="mt-1 cursor-pointer text-left text-xs font-semibold text-pink-400 hover:text-pink-300"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          Xem thêm
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto mt-0.5 max-w-full">
      <div
        className={expandedPanelClass}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="region"
        aria-label="Tiêu đề đầy đủ"
      >
        <p className="whitespace-pre-wrap break-words font-extrabold">{text}</p>
      </div>
      <button
        type="button"
        className="mt-1 cursor-pointer text-left text-xs font-semibold text-pink-400 hover:text-pink-300"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(false);
        }}
      >
        Thu gọn
      </button>
    </div>
  );
}
