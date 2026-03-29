import { useLayoutEffect, useState } from "react";

function estimateStridePx() {
  if (typeof window === "undefined") return 744;
  const gap = 144;
  return Math.max(420, window.innerHeight - 112) + gap;
}

export function useFeedStride(scrollRef) {
  const [stride, setStride] = useState(estimateStridePx);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const gap =
        parseFloat(style.rowGap || style.gap || "0") || 0;
      setStride(el.clientHeight + gap);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollRef]);

  return stride;
}
