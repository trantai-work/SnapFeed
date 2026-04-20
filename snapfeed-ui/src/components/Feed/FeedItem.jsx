import { memo, useCallback, useRef } from "react";
import { formatCount } from "../../utils/format";
import { buildVideoSrc } from "../../utils/feedVideo";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  normalizeReactApiResponse,
} from "../../utils/feedItem";
import { videosApi } from "../../api/video.api";
import { useAuth } from "../../context/AuthContext";
import { useAutoPlayVideo } from "../../hooks/useAutoPlayVideo";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { FeedActions } from "./FeedActions";
import { FeedDescription } from "./FeedDescription";
import { FeedVideoMobileBar } from "./FeedVideoMobileBar";
import { openAuthModal } from "../../utils/authModalBus";

function FeedItemComponent({
  item,
  instanceId,
  isActive,
  slideHeightClass,
  scrollRootRef,
  onReactionUpdate,
  onOpenComments,
}) {
  const { isAuthenticated } = useAuth();
  const videoRef = useRef(null);
  const reactInFlightRef = useRef(false);
  const src = buildVideoSrc(item.videoKey);
  const poster = item.thumbnail || undefined;
  const displayName = getUserDisplayName(item);
  const avatarUrl = getUserAvatarUrl(item);
  const viewLabel = formatCount(item.viewCount ?? 0);
  const reactionLabel = formatCount(item.reactionCount ?? 0);
  const commentLabel = formatCount(item.commentCount ?? 0);
  const saveLabel = formatCount(0);
  const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean) : [];

  const showNativeControls = useMediaQuery("(min-width: 1024px)");

  useAutoPlayVideo(videoRef, scrollRootRef, instanceId || item.videoKey, isActive);

  const togglePlayMobile = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const handleReact = useCallback(
    async (reaction) => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      if (reactInFlightRef.current) return;
      reactInFlightRef.current = true;
      try {
        const raw = await videosApi.reactToVideo(item.id, reaction);
        onReactionUpdate?.(item.id, normalizeReactApiResponse(raw));
      } catch (e) {
        console.error(e);
      } finally {
        reactInFlightRef.current = false;
      }
    },
    [isAuthenticated, item.id, onReactionUpdate]
  );

  const requireAuth = useCallback(() => {
    openAuthModal();
  }, []);

  const slideClass = [
    "flex w-full shrink-0 snap-start snap-always items-stretch justify-center overflow-hidden bg-white dark:bg-black lg:bg-white dark:lg:bg-black",
    slideHeightClass,
  ].join(" ");

  const actionsProps = {
    reactionLabel,
    commentLabel,
    saveLabel,
    shareLabel: "Chia sẻ",
    avatarUrl,
    profileUserId: item.user,
    myReaction: item.myReaction ?? null,
    reactDisabled: !isAuthenticated,
    onReact: handleReact,
    onRequireAuth: requireAuth,
    onComment: () => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      onOpenComments?.(item.id);
    },
    onSave: () => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      // TODO: save video
    },
    onShare: () => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      // TODO: share video
    },
  };

  return (
    <div data-feed-slide className={`${slideClass} max-w-full min-w-0`}>
      <div className="flex h-full min-h-0 w-full max-w-full items-stretch justify-center bg-white dark:bg-black max-lg:min-w-0 lg:bg-white dark:lg:bg-black">
        <div className="flex h-full min-h-0 max-h-full w-full min-w-0 max-w-full items-stretch lg:w-fit">
          <div className="feed-video-wrap group relative h-full min-h-0 w-full min-w-0 shrink overflow-visible rounded-none bg-white dark:bg-black lg:max-w-full lg:overflow-hidden lg:rounded-2xl lg:w-fit lg:bg-white dark:lg:bg-black">
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

            {tags.length > 0 ? (
              <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-5rem)] flex-wrap gap-2">
                {tags.slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-[1px]"
                  >
                    #{t}
                  </span>
                ))}
                {tags.length > 2 ? (
                  <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-[1px]">
                    +{tags.length - 2}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 max-w-[calc(100%-3.75rem)] p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pr-14 sm:bottom-24 sm:max-w-[calc(100%-4rem)] sm:pr-16 lg:bottom-14 lg:max-w-full lg:pr-4">
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

            {src && !showNativeControls ? (
              <FeedVideoMobileBar
                videoRef={videoRef}
                mediaKey={instanceId || item.videoKey}
              />
            ) : null}
          </div>

          <FeedActions {...actionsProps} />
        </div>
      </div>
    </div>
  );
}

export const FeedItem = memo(FeedItemComponent);
