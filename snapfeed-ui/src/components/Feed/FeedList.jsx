import { useEffect, useRef } from "react";
import { useCurrentIndex } from "../../hooks/useCurrentIndex";
import { useFeedStride } from "../../hooks/useFeedStride";
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

export function FeedList({ items = [], onEndReached }) {
  const scrollRef = useRef(null);
  const endTriggeredForLengthRef = useRef(null);

  const stride = useFeedStride(scrollRef);
  const currentIndex = useCurrentIndex(scrollRef, items.length, stride);
  const { start, end } = useVirtualList(currentIndex, items.length);

  const { canScrollUp, canScrollDown, scrollFeed } = useScrollSnapNavigation(
    scrollRef,
    items.length,
    stride
  );

  const scrollClassName = [
    "flex flex-col snap-y snap-mandatory overflow-y-auto overscroll-y-contain rounded-none lg:rounded-xl",
    FEED_SCROLL_GAP_CLASS,
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    SLIDE_HEIGHT_CLASS,
  ].join(" ");

  const visible = items.slice(start, end);
  const padBottom = Math.max(0, items.length - end) * stride;

  useEffect(() => {
    if (typeof onEndReached !== "function") return;
    if (!items.length) return;

    const nearEnd = currentIndex >= items.length - 3;
    if (!nearEnd) return;

    if (endTriggeredForLengthRef.current === items.length) return;
    endTriggeredForLengthRef.current = items.length;
    onEndReached();
  }, [currentIndex, items.length, onEndReached]);

  return (
    <div className="relative box-border h-[min(100svh,100dvh)] max-h-[min(100svh,100dvh)] w-full min-w-0 max-w-full lg:h-auto lg:max-h-none lg:max-w-none">
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
              const video = item?.video ?? item;

              return (
                <FeedItem
                  key={item?.instanceId || item?.videoKey || item?.id || index}
                  item={video}
                  instanceId={item?.instanceId}
                  isActive={index === currentIndex}
                  slideHeightClass={SLIDE_HEIGHT_CLASS}
                  scrollRootRef={scrollRef}
                />
              );
            })}
          </div>
        </div>
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