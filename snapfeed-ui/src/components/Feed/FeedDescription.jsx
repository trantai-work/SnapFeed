import { useEffect, useState } from "react";
import { LONG_DESCRIPTION_CHARS } from "./feedConstants";

const expandedPanelClass =
  "max-h-32 overflow-y-auto overscroll-contain rounded-lg border border-white/15 " +
  "bg-gradient-to-b from-white/[0.06] via-black/20 to-black/40 px-2.5 py-2 text-sm leading-snug " +
  "text-white/95 shadow-lg shadow-black/25 backdrop-blur-xl " +
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function FeedDescription({ text, videoItemId }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [videoItemId]);

  if (!text) return null;

  const isLong = text.length > LONG_DESCRIPTION_CHARS;

  if (!isLong) {
    return (
      <p className="mt-1 text-sm text-white/95 drop-shadow">{text}</p>
    );
  }

  if (!expanded) {
    return (
      <div className="pointer-events-auto mt-1 max-w-full">
        <p className="line-clamp-3 text-sm text-white/95 drop-shadow">{text}</p>
        <button
          type="button"
          className="mt-1.5 cursor-pointer text-left text-xs font-semibold text-pink-400 hover:text-pink-300"
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
    <div className="pointer-events-auto mt-1 max-w-full">
      <div
        className={expandedPanelClass}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="region"
        aria-label="Nội dung mô tả đầy đủ"
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
      <button
        type="button"
        className="mt-1.5 cursor-pointer text-left text-xs font-semibold text-pink-400 hover:text-pink-300"
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
