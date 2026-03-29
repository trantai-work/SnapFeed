import { useRef } from "react";
import { Loader2 } from "lucide-react";
import { useCurrentIndex } from "../../hooks/useCurrentIndex";
import { useFeedStride } from "../../hooks/useFeedStride";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { useScrollSnapNavigation } from "../../hooks/useScrollSnapNavigation";
import { useVirtualList } from "../../hooks/useVirtualList";
import { FeedItem } from "./FeedItem";
import { FeedNavigation } from "./FeedNavigation";
import { FEED_SCROLL_GAP_CLASS, SLIDE_HEIGHT_CLASS } from "./feedConstants";

const FEED_INNER_COL_CLASS = [
  "flex",
  "flex-col",
  FEED_SCROLL_GAP_CLASS,
  "w-full",
  "min-w-0",
  "items-stretch",
].join(" ");

export function FeedList({ items = [], nextUrl, loadingMore, loadMore }) {
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const stride = useFeedStride(scrollRef);
  const currentIndex = useCurrentIndex(scrollRef, items.length, stride);
  const { start, end } = useVirtualList(currentIndex, items.length);

  const { canScrollUp, canScrollDown, scrollFeed } = useScrollSnapNavigation(
    scrollRef,
    items.length,
    stride
  );

  useInfiniteScroll({
    scrollRootRef: scrollRef,
    sentinelRef,
    enabled: Boolean(nextUrl),
    onLoadMore: loadMore,
    dependencyKey: items.length,
  });

  const scrollClassName = [
    "flex flex-col snap-y snap-mandatory overflow-y-auto overscroll-y-contain rounded-xl",
    FEED_SCROLL_GAP_CLASS,
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    SLIDE_HEIGHT_CLASS,
  ].join(" ");

  const visible = items.slice(start, end);
  const padBottom = Math.max(0, items.length - end) * stride;

  return (
    <div className="relative w-full">
      <div ref={scrollRef} className={scrollClassName}>
        <div
          className="box-border w-full min-w-0"
          style={{
            paddingTop: start * stride,
            paddingBottom: padBottom,
          }}
        >
          <div className={FEED_INNER_COL_CLASS}>
            {visible.map((item, i) => {
              const index = start + i;

              return (
                <FeedItem
                  key={item?.id ?? index}
                  item={item}
                  isActive={index === currentIndex}
                  slideHeightClass={SLIDE_HEIGHT_CLASS}
                  scrollRootRef={scrollRef}
                />
              );
            })}
          </div>
        </div>

        {nextUrl && (
          <div
            ref={sentinelRef}
            className="flex h-16 shrink-0 snap-start items-center justify-center text-white/50"
            aria-hidden
          >
            {loadingMore ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <span className="text-xs" />
            )}
          </div>
        )}
      </div>

      <FeedNavigation
        canScrollUp={!!canScrollUp}
        canScrollDown={!!canScrollDown}
        onPrev={() => scrollFeed(-1)}
        onNext={() => scrollFeed(1)}
      />
    </div>
  );
}