import { useEffect } from "react";

/**
 * Loads more when the sentinel intersects the scroll root (cursor pagination).
 */
export function useInfiniteScroll({
  scrollRootRef,
  sentinelRef,
  enabled,
  onLoadMore,
  dependencyKey,
}) {
  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !enabled) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: "120px 0px", threshold: 0 }
    );

    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [dependencyKey, enabled, onLoadMore, scrollRootRef, sentinelRef]);
}
