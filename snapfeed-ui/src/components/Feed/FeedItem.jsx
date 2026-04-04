import { memo, useCallback, useRef } from "react";
import { formatCount } from "../../utils/format";
import { buildVideoSrc } from "../../utils/feedVideo";
import { getUserAvatarUrl, getUserDisplayName } from "../../utils/feedItem";
import { useAutoPlayVideo } from "../../hooks/useAutoPlayVideo";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { FeedActions } from "./FeedActions";
import { FeedDescription } from "./FeedDescription";

function FeedItemComponent({
  item,
  instanceId,
  isActive,
  slideHeightClass,
  scrollRootRef,
}) {
  const videoRef = useRef(null);
  const src = buildVideoSrc(item.videoKey);
  const poster = item.thumbnail || undefined;
  const displayName = getUserDisplayName(item);
  const avatarUrl = getUserAvatarUrl(item);
  const viewLabel = formatCount(item.viewCount ?? 0);
  const reactionLabel = formatCount(item.reactionCount ?? 0);
  const commentLabel = formatCount(item.commentCount ?? 0);
  const saveLabel = formatCount(0);

  const showNativeControls = useMediaQuery("(min-width: 1024px)");

  useAutoPlayVideo(videoRef, scrollRootRef, instanceId || item.videoKey, isActive);

  const togglePlayMobile = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const slideClass = [
    "flex w-full shrink-0 snap-start snap-always items-stretch justify-center overflow-hidden bg-white dark:bg-black lg:bg-zinc-200 dark:lg:bg-black",
    slideHeightClass,
  ].join(" ");

  const actionsProps = {
    reactionLabel,
    commentLabel,
    saveLabel,
    shareLabel: "Chia sẻ",
    avatarUrl,
  };

  return (
    <div data-feed-slide className={`${slideClass} max-w-full min-w-0`}>
      <div className="flex h-full min-h-0 w-full max-w-full items-stretch justify-center bg-white dark:bg-black max-lg:min-w-0 lg:bg-zinc-200 dark:lg:bg-black">
        <div className="flex h-full min-h-0 max-h-full w-full min-w-0 max-w-full items-stretch lg:w-fit">
          <div className="feed-video-wrap group relative h-full min-h-0 w-full min-w-0 shrink overflow-hidden rounded-none bg-white dark:bg-black lg:max-w-full lg:rounded-2xl lg:w-fit lg:bg-zinc-200 dark:lg:bg-black">
            {src ? (
              <video
                ref={videoRef}
                className="feed-video block h-full w-full max-h-full max-w-full object-contain max-lg:cursor-pointer"
                src={src}
                poster={poster}
                loop
                playsInline
                controls={showNativeControls}
                controlsList={showNativeControls ? "nodownload" : undefined}
                preload="metadata"
                onClick={showNativeControls ? undefined : togglePlayMobile}
                aria-label={showNativeControls ? undefined : "Chạm để tạm dừng hoặc phát"}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center px-4 text-center text-sm text-zinc-500 dark:text-white/60">
                Thiếu cấu hình VITE_S3_BUCKET_URL hoặc videoKey
              </div>
            )}

            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20"
              aria-hidden
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-12 z-10 max-w-[calc(100%-3.75rem)] p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pr-14 sm:bottom-14 sm:max-w-[calc(100%-4rem)] sm:pr-16 lg:max-w-full lg:pr-4">
              <p className="text-sm font-semibold text-white drop-shadow">
                {displayName}
              </p>
              <FeedDescription
                text={item.description}
                videoItemId={item.id}
              />
              <p className="mt-2 text-xs text-white/60 drop-shadow">
                {viewLabel} lượt xem
              </p>
            </div>

            <FeedActions
              {...actionsProps}
              overlay
              className="lg:hidden"
            />
          </div>

          <FeedActions {...actionsProps} />
        </div>
      </div>
    </div>
  );
}

export const FeedItem = memo(FeedItemComponent);
