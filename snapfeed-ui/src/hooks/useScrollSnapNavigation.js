import { useCallback, useEffect, useRef, useState } from "react";
import { animateScrollTop } from "../utils/scroll";

const SCROLL_ANIM_MS = 520;
const SCROLL_END_EPS = 8;

export function useScrollSnapNavigation(scrollRef, itemCount, stride) {
  const scrollAnimCancelRef = useRef(() => {});
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > SCROLL_END_EPS);
    setCanScrollDown(
      el.scrollTop + el.clientHeight < el.scrollHeight - SCROLL_END_EPS
    );
  }, [scrollRef]);

  const scrollFeed = useCallback(
    (direction) => {
      const el = scrollRef.current;
      if (!el || stride <= 0 || itemCount === 0) return;

      const idx = Math.min(
        itemCount - 1,
        Math.max(0, Math.round(el.scrollTop / stride))
      );

      scrollAnimCancelRef.current();

      let targetTop;
      if (direction < 0) {
        targetTop = Math.max(0, idx - 1) * stride;
      } else if (idx < itemCount - 1) {
        targetTop = (idx + 1) * stride;
      } else {
        targetTop = Math.max(0, el.scrollHeight - el.clientHeight);
      }

      scrollAnimCancelRef.current = animateScrollTop(
        el,
        targetTop,
        SCROLL_ANIM_MS,
        updateScrollButtons
      );
    },
    [scrollRef, itemCount, stride, updateScrollButtons]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tick = () => requestAnimationFrame(() => updateScrollButtons());
    tick();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(tick);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [itemCount, stride, updateScrollButtons, scrollRef]);

  return { canScrollUp, canScrollDown, scrollFeed };
}
