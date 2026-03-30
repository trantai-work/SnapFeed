import { memo, useRef } from "react";
import { formatCount } from "../../utils/format";
import { buildVideoSrc } from "../../utils/feedVideo";
import { getUserAvatarUrl, getUserDisplayName } from "../../utils/feedItem";
import { useAutoPlayVideo } from "../../hooks/useAutoPlayVideo";
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

  useAutoPlayVideo(videoRef, scrollRootRef, instanceId || item.videoKey, isActive);

  const slideClass = [
    "flex w-full shrink-0 snap-start snap-always items-stretch justify-center overflow-hidden bg-black",
    slideHeightClass,
  ].join(" ");

  return (
    <div data-feed-slide className={slideClass}>
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full items-stretch justify-center">
        <div className="flex h-full min-h-0 max-h-full w-fit min-w-0 max-w-full items-stretch">
          <div className="feed-video-wrap group relative h-full min-h-0 min-w-0 shrink overflow-hidden rounded-2xl">
            {src ? (
              <video
                ref={videoRef}
                className="feed-video block h-full max-h-full w-auto min-h-0 max-w-full object-contain"
                src={src}
                poster={poster}
                loop
                playsInline
                controls
                controlsList="nodownload"
                preload="metadata"
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center px-4 text-center text-sm text-white/60">
                Thiếu cấu hình VITE_S3_BUCKET_URL hoặc videoKey
              </div>
            )}

            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20"
              aria-hidden
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 p-4 pb-2">
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
          </div>

          <FeedActions
            reactionLabel={reactionLabel}
            commentLabel={commentLabel}
            saveLabel={saveLabel}
            shareLabel="Chia sẻ"
            avatarUrl={avatarUrl}
          />
        </div>
      </div>
    </div>
  );
}

export const FeedItem = memo(FeedItemComponent);
