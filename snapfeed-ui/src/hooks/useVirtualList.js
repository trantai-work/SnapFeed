import { useMemo } from "react";

export function useVirtualList(currentIndex, itemCount) {
  return useMemo(() => {
    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(itemCount, currentIndex + 3);
    return { start, end };
  }, [currentIndex, itemCount]);
}
