import { useEffect, useState } from "react";

export function useCurrentIndex(scrollRef, itemCount, stride) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || stride <= 0 || itemCount <= 0) return;

    const sync = () => {
      const idx = Math.min(
        itemCount - 1,
        Math.max(0, Math.round(el.scrollTop / stride))
      );
      setCurrentIndex(idx);
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(sync);
    });
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [scrollRef, itemCount, stride]);

  return currentIndex;
}
