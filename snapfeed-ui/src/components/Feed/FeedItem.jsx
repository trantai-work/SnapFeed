import { memo, useCallback, useEffect, useRef, useState } from "react";
import { formatCount, formatRelativeTimeVi } from "../../utils/format";
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
import { FeedTitle } from "./FeedTitle";
import { FeedVideoMobileBar } from "./FeedVideoMobileBar";
import { openAuthModal } from "../../utils/authModalBus";
import HLSVideoPlayer from "../HLSVideoPlayer";

function FeedItemComponent({
  item,
  instanceId,
  isActive,
  slideHeightClass,
  scrollRootRef,
  onReactionUpdate,
  onOpenComments,
  onReport,
  onFollowUpdate,
  onShare,
  devMode = false,
}) {
  const { isAuthenticated, user } = useAuth();
  const videoRef = useRef(null);
  const reactInFlightRef = useRef(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Use HLS URL if available and status is ready, otherwise fallback to direct mp4
  const hlsUrl = item.status === "ready" && item.hlsPlaylistKey 
    ? buildVideoSrc(item.hlsPlaylistKey) 
    : null;
  const src = buildVideoSrc(item.videoKey);
  
  const poster = item.thumbnail || undefined;
  const displayName = getUserDisplayName(item);
  const avatarUrl = getUserAvatarUrl(item);
  const viewLabel = formatCount(item.viewCount ?? 0);
  const reactionLabel = formatCount(item.reactionCount ?? 0);
  const commentLabel = formatCount(item.commentCount ?? 0);
  const createdAtLabel = formatRelativeTimeVi(item.createdAt);
  const tags = Array.isArray(item?.tags) ? item.tags.filter(Boolean) : [];

  const showNativeControls = useMediaQuery("(min-width: 1024px)");

  useAutoPlayVideo(videoRef, scrollRootRef, instanceId || item.videoKey, isActive);

  // Track watch time
  const maxWatchTimeRef = useRef(0);
  const wasActiveRef = useRef(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      const t = Math.floor(v.currentTime);
      if (t > maxWatchTimeRef.current) maxWatchTimeRef.current = t;
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  });

  useEffect(() => {
    if (isActive) {
      wasActiveRef.current = true;
      maxWatchTimeRef.current = 0;
      return;
    }
    if (!wasActiveRef.current) return;
    if (!isAuthenticated || !item.id) return;
    const watchTime = maxWatchTimeRef.current;
    videosApi.recordView({ videoId: item.id, watchTime }).catch(() => {});
  }, [isActive, item.id, isAuthenticated]);

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
    viewLabel: viewLabel ? `${viewLabel}` : null,
    reactionLabel,
    commentLabel,
    avatarUrl,
    profileUserId: item.user,
    myReaction: item.myReaction ?? null,
    reactDisabled: !isAuthenticated,
    isFollowing: item.isFollowing ?? false,
    currentUserId: user?.id ?? null,
    onReact: handleReact,
    onRequireAuth: requireAuth,
    onFollowUpdate,
    onComment: () => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      onOpenComments?.(item.id);
    },
    onReport: () => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      onReport?.(item);
    },
    onShare: () => {
      if (!isAuthenticated) {
        openAuthModal();
        return;
      }
      onShare?.(item);
    },
  };

  return (
    <div data-feed-slide className={`${slideClass} max-w-full min-w-0`}>
      <div className="flex h-full min-h-0 w-full max-w-full items-stretch justify-center bg-white dark:bg-black max-lg:min-w-0 lg:bg-white dark:lg:bg-black">
        <div className="flex h-full min-h-0 max-h-full w-full min-w-0 max-w-full items-stretch lg:w-fit">
          <div className="feed-video-wrap group relative h-full min-h-0 w-full min-w-0 shrink overflow-visible rounded-none bg-white dark:bg-black lg:max-w-full lg:overflow-hidden lg:rounded-2xl lg:w-fit lg:bg-white dark:lg:bg-black">
            
            {devMode && (
              <div className="absolute left-4 top-4 z-30 rounded-2xl border border-white/20 bg-black/60 p-3.5 text-xs text-white backdrop-blur-md shadow-lg select-none min-w-[200px]">
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-300">Similarity:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {(item.similarityScore ?? 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-300">Engagement:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {(item.engagementScore ?? 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-300">Recency:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {(item.recencyScore ?? 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="h-[1px] bg-white/10 my-2" />
                  <div className="flex justify-between gap-4 text-[13px] font-bold">
                    <span className="text-pink-300">Total Score:</span>
                    <span className="font-mono text-pink-400">
                      {(item.totalScore ?? 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {src ? (
              <HLSVideoPlayer
                videoRef={videoRef}
                className="feed-video block h-full w-full max-h-full max-w-full object-contain max-lg:cursor-pointer"
                src={src}
                hlsUrl={hlsUrl}
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

            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 max-w-[calc(100%-3.75rem)] p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pr-14 sm:bottom-24 sm:max-w-[calc(100%-4rem)] sm:pr-16 lg:bottom-14 lg:max-w-full lg:pr-4">
              <p className="text-sm font-semibold text-white drop-shadow">
                {displayName}
                {createdAtLabel ? (
                  <span className="font-medium text-white/80"> · {createdAtLabel}</span>
                ) : null}
              </p>
              <FeedTitle
                text={item.title}
                videoItemId={item.id}
              />
              <FeedDescription
                text={item.description}
                videoItemId={item.id}
              />
              {tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 pointer-events-auto">
                  {tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-[1px]"
                    >
                      #{t}
                    </span>
                  ))}
                  {tags.length > 2 ? (
                    <div 
                      className="relative cursor-help"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <span className="rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-[1px]">
                        +{tags.length - 2}
                      </span>
                      <div className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2.5 w-max max-w-[200px] -translate-x-1/2 rounded-xl bg-black/90 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md transition-all duration-200 flex flex-wrap gap-1.5 border border-white/10 ${showTooltip ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
                        {tags.slice(2).map((t) => (
                          <span key={t} className="text-white/90">
                            #{t}
                          </span>
                        ))}
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1 rotate-45 bg-black/90 border-r border-b border-white/10" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
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
