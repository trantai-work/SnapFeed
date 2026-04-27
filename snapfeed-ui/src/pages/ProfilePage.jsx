import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Grid3X3, Heart, MessageCircle, Play, Send, UserPlus, UserCheck, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { conversationsApi, usersApi } from "../api";
import { formatCount } from "../utils/format";
import { buildVideoSrc } from "../utils/feedVideo";
import VideoViewerPanel from "../components/VideoViewerPanel";
import UserListModal from "../components/UserListModal";
import { videosApi } from "../api/video.api";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatCompactNumber(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  if (x < 1000) return String(x);
  if (x < 1_000_000) return `${(x / 1000).toFixed(x >= 10_000 ? 0 : 1)}K`;
  return `${(x / 1_000_000).toFixed(x >= 10_000_000 ? 0 : 1)}M`;
}

export default function ProfilePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState("videos"); // videos | liked | followers | following
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");
  const [videosNextCursor, setVideosNextCursor] = useState(null);
  const [videosLoadedOnce, setVideosLoadedOnce] = useState(false);
  const [likedVideos, setLikedVideos] = useState([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedError, setLikedError] = useState("");
  const [likedNextCursor, setLikedNextCursor] = useState(null);
  const [likedLoadedOnce, setLikedLoadedOnce] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [userListModal, setUserListModal] = useState({ open: false, type: null });
  const [followLoading, setFollowLoading] = useState(false);

  const routeUserId = useMemo(() => {
    const raw = params?.id;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params?.id]);

  const authUserId = user?.id ?? null;

  const effectiveUser = routeUserId ? profileUser : user;
  const effectiveUserId = routeUserId ?? authUserId;
  const isViewingOtherUser = !!routeUserId && authUserId && routeUserId !== authUserId;
  const [dmStarting, setDmStarting] = useState(false);

  const displayName = useMemo(() => {
    const fn = effectiveUser?.firstName || effectiveUser?.first_name || "";
    const ln = effectiveUser?.lastName || effectiveUser?.last_name || "";
    const full = `${fn} ${ln}`.trim();
    return full || effectiveUser?.username || "User";
  }, [effectiveUser]);

  const username = effectiveUser?.username || "";
  const avatarUrl = effectiveUser?.avatarUrl || effectiveUser?.avatar_url || "";
  const likeCount =
    effectiveUser?.likeCount ??
    effectiveUser?.like_count ??
    effectiveUser?.totalLikes ??
    0;
  const followerCount = effectiveUser?.followerCount ?? effectiveUser?.follower_count ?? 0;
  const followingCount = effectiveUser?.followingCount ?? effectiveUser?.following_count ?? 0;
  const isFollowing = effectiveUser?.isFollowing ?? effectiveUser?.is_following ?? false;

  const handleFollow = async () => {
    if (!routeUserId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(routeUserId);
        // Update local state optimistically
        setProfileUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            isFollowing: false,
            is_following: false,
            followerCount: Math.max(0, (prev.followerCount ?? prev.follower_count ?? 0) - 1),
            follower_count: Math.max(0, (prev.followerCount ?? prev.follower_count ?? 0) - 1),
          };
        });
      } else {
        await usersApi.follow(routeUserId);
        // Update local state optimistically
        setProfileUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            isFollowing: true,
            is_following: true,
            followerCount: (prev.followerCount ?? prev.follower_count ?? 0) + 1,
            follower_count: (prev.followerCount ?? prev.follower_count ?? 0) + 1,
          };
        });
      }
    } catch (error) {
      console.error("Follow error:", error);
      // Revert on error
      await loadProfileUser();
    } finally {
      setFollowLoading(false);
    }
  };

  const loadUserVideos = useCallback(
    async ({ reset } = {}) => {
      if (!effectiveUserId) return;
      if (videosLoading) return;

      setVideosLoading(true);
      setVideosError("");
      try {
        const page = await usersApi.videos(effectiveUserId, {
          cursor: reset ? null : videosNextCursor,
        });

        setVideos((prev) => (reset ? page.results : [...prev, ...page.results]));
        setVideosNextCursor(page.nextCursor ?? null);
        setVideosLoadedOnce(true);
      } catch (e) {
        setVideosError(e?.message || "Không thể tải danh sách video.");
      } finally {
        setVideosLoading(false);
      }
    },
    [effectiveUserId, videosLoading, videosNextCursor]
  );

  const loadLikedVideos = useCallback(
    async ({ reset } = {}) => {
      if (!effectiveUserId) return;
      if (likedLoading) return;

      setLikedLoading(true);
      setLikedError("");
      try {
        const page = await usersApi.reactedVideos(effectiveUserId, {
          cursor: reset ? null : likedNextCursor,
        });

        setLikedVideos((prev) => (reset ? page.results : [...prev, ...page.results]));
        setLikedNextCursor(page.nextCursor ?? null);
        setLikedLoadedOnce(true);
      } catch (e) {
        setLikedError(e?.message || "Không thể tải danh sách video đã thích.");
      } finally {
        setLikedLoading(false);
      }
    },
    [effectiveUserId, likedLoading, likedNextCursor]
  );

  const loadProfileUser = useCallback(async () => {
    if (!effectiveUserId) {
      setProfileUser(null);
      setProfileError("");
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    try {
      const u = await usersApi.profile(effectiveUserId);
      setProfileUser(u || null);
    } catch (e) {
      setProfileError(e?.message || "Không thể tải thông tin hồ sơ.");
      setProfileUser(null);
    } finally {
      setProfileLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadProfileUser();
  }, [isAuthenticated, loadProfileUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const openVideoId = location?.state?.openVideoId;
    if (!openVideoId) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await videosApi.getById(openVideoId);
        if (cancelled) return;
        if (v) setSelectedVideo(v);
      } finally {
        // Clear state so it won't reopen on re-render/back.
        if (!cancelled) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location?.pathname, location?.state?.openVideoId, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab !== "videos") return;
    if (videosLoadedOnce) return;
    loadUserVideos({ reset: true });
  }, [isAuthenticated, tab, videosLoadedOnce, loadUserVideos]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab !== "liked") return;
    if (likedLoadedOnce) return;
    loadLikedVideos({ reset: true });
  }, [isAuthenticated, likedLoadedOnce, loadLikedVideos, tab]);

  useEffect(() => {
    setVideos([]);
    setVideosNextCursor(null);
    setVideosLoadedOnce(false);
    setVideosError("");
    setLikedVideos([]);
    setLikedNextCursor(null);
    setLikedLoadedOnce(false);
    setLikedError("");
    setSelectedVideo(null);
  }, [effectiveUserId]);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 py-14 text-center">
        <div className="text-lg font-semibold text-zinc-900 dark:text-white">
          Bạn cần đăng nhập để xem hồ sơ.
        </div>
      </div>
    );
  }

  if (routeUserId && profileLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-zinc-600 dark:text-white/70 lg:px-0">
        Đang tải hồ sơ...
      </div>
    );
  }

  if (routeUserId && profileError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-0">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {profileError}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-0">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username || ""}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-24 w-24 shrink-0 rounded-full bg-zinc-200 dark:bg-white/10" />
          )}

          <div className="min-w-0">
            <div className="truncate text-xl font-extrabold text-zinc-900 dark:text-white">
              {username || displayName}
            </div>
            <div className="mt-1 truncate text-sm text-zinc-600 dark:text-white/70">
              {displayName}
            </div>

            <div className="mt-3 flex items-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setUserListModal({ open: true, type: "following" })}
                className="cursor-pointer text-zinc-900 transition hover:text-pink-600 dark:text-white dark:hover:text-pink-400"
              >
                <span className="font-bold">{formatCompactNumber(followingCount)}</span>{" "}
                <span className="text-zinc-500 dark:text-white/55">Đang theo dõi</span>
              </button>
              <button
                type="button"
                onClick={() => setUserListModal({ open: true, type: "followers" })}
                className="cursor-pointer text-zinc-900 transition hover:text-pink-600 dark:text-white dark:hover:text-pink-400"
              >
                <span className="font-bold">{formatCompactNumber(followerCount)}</span>{" "}
                <span className="text-zinc-500 dark:text-white/55">Người theo dõi</span>
              </button>
              <div className="text-zinc-900 dark:text-white">
                <span className="font-bold">{formatCompactNumber(likeCount)}</span>{" "}
                <span className="text-zinc-500 dark:text-white/55">Lượt thích</span>
              </div>
            </div>
          </div>
        </div>

        {isViewingOtherUser ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={followLoading}
              onClick={handleFollow}
              className={classNames(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                "cursor-pointer",
                isFollowing
                  ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  : "bg-pink-600 text-white hover:bg-pink-500 active:bg-pink-700",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
              aria-label={isFollowing ? "Bỏ theo dõi" : "Theo dõi"}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={16} strokeWidth={2} aria-hidden />
                  {followLoading ? "Đang xử lý..." : "Hủy theo dõi"}
                </>
              ) : (
                <>
                  <UserPlus size={16} strokeWidth={2} aria-hidden />
                  {followLoading ? "Đang xử lý..." : "Theo dõi"}
                </>
              )}
            </button>
            <button
              type="button"
              disabled={dmStarting}
              onClick={async () => {
                if (!routeUserId) return;
                if (dmStarting) return;
                setDmStarting(true);
                try {
                  const conv = await conversationsApi.direct(routeUserId);
                  navigate("/chats", {
                    state: { openConversation: conv || null },
                  });
                } catch (e) {
                  // Best-effort: keep user on profile; errors will be shown by global handlers/toasts if any.
                  console.error(e);
                } finally {
                  setDmStarting(false);
                }
              }}
              className={classNames(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                "cursor-pointer",
                "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
              aria-label="Nhắn tin"
            >
              <Send size={16} strokeWidth={2} aria-hidden />
              {dmStarting ? "Đang mở…" : "Nhắn tin"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 border-b border-zinc-200 dark:border-white/10">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setTab("videos")}
            className={classNames(
              "relative -mb-px rounded-lg px-2 pb-3 pt-2 text-sm font-semibold transition-colors",
              "hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-white/10 dark:active:bg-white/15",
              "cursor-pointer",
              tab === "videos"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-white/55 dark:hover:text-white/80"
            )}
          >
            Video
            {tab === "videos" ? (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-pink-500" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setTab("liked")}
            className={classNames(
              "relative -mb-px rounded-lg px-2 pb-3 pt-2 text-sm font-semibold transition-colors",
              "hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-white/10 dark:active:bg-white/15",
              "cursor-pointer",
              tab === "liked"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-white/55 dark:hover:text-white/80"
            )}
          >
            Đã thích
            {tab === "liked" ? (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-pink-500" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setTab("following")}
            className={classNames(
              "relative -mb-px rounded-lg px-2 pb-3 pt-2 text-sm font-semibold transition-colors",
              "hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-white/10 dark:active:bg-white/15",
              "cursor-pointer",
              tab === "following"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-white/55 dark:hover:text-white/80"
            )}
          >
            Đang theo dõi
            {tab === "following" ? (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-pink-500" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setTab("followers")}
            className={classNames(
              "relative -mb-px rounded-lg px-2 pb-3 pt-2 text-sm font-semibold transition-colors",
              "hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-white/10 dark:active:bg-white/15",
              "cursor-pointer",
              tab === "followers"
                ? "text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-white/55 dark:hover:text-white/80"
            )}
          >
            Người theo dõi
            {tab === "followers" ? (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-pink-500" />
            ) : null}
          </button>
        </div>
      </div>

      {tab === "videos" ? (
        <div className="mt-5">
          {videosError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {videosError}
            </div>
          ) : null}

          {videos.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
                {videos.map((v) => {
                  const poster = v.thumbnail || "";
                  const src = buildVideoSrc(v.videoKey);
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedVideo(v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedVideo(v);
                        }
                      }}
                      className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/5 transition hover:-translate-y-[1px] hover:ring-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-white/20"
                    >
                      <div className="aspect-[9/16] w-full">
                        {poster ? (
                          <img
                            src={poster}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-white/60">
                            <Play size={18} aria-hidden />
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent opacity-100" />

                        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-white">
                          {formatCount(v.viewCount ?? 0)} lượt xem
                        </div>

                        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white/90 opacity-100">
                          <div className="flex items-center gap-1.5">
                            <Heart size={14} strokeWidth={2} aria-hidden />
                            <span className="font-semibold">
                              {formatCount(v.reactionCount ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MessageCircle size={14} strokeWidth={2} aria-hidden />
                            <span className="font-semibold">
                              {formatCount(v.commentCount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!poster && src ? (
                        <video className="hidden" src={src} preload="metadata" playsInline />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-center">
                {videosNextCursor ? (
                  <button
                    type="button"
                    onClick={() => loadUserVideos({ reset: false })}
                    disabled={videosLoading}
                    className={classNames(
                      "rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors",
                      "cursor-pointer",
                      "hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60",
                      "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/15"
                    )}
                  >
                    {videosLoading ? "Đang tải..." : "Xem thêm"}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-white/60">
                <Grid3X3 size={26} strokeWidth={1.75} aria-hidden />
              </div>
              <div className="text-sm font-semibold text-zinc-700 dark:text-white/75">
                {videosLoading ? "Đang tải..." : "Chưa có video"}
              </div>
              <div className="text-sm text-zinc-500 dark:text-white/55">
                Video của bạn sẽ xuất hiện{" "}
                <Link
                  to="/upload"
                  className="font-semibold text-pink-600 hover:text-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                >
                  tại đây
                </Link>
                .
              </div>
            </div>
          )}
        </div>
      ) : tab === "liked" ? (
        <div className="mt-5">
          {likedError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {likedError}
            </div>
          ) : null}

          {likedVideos.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
                {likedVideos.map((v) => {
                  const poster = v.thumbnail || "";
                  const src = buildVideoSrc(v.videoKey);
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedVideo(v)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedVideo(v);
                        }
                      }}
                      className="group relative cursor-pointer overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/5 transition hover:-translate-y-[1px] hover:ring-black/10 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-white/20"
                    >
                      <div className="aspect-[9/16] w-full">
                        {poster ? (
                          <img
                            src={poster}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-white/60">
                            <Play size={18} aria-hidden />
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent opacity-100" />

                        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-white">
                          {formatCount(v.viewCount ?? 0)} lượt xem
                        </div>

                        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white/90 opacity-100">
                          <div className="flex items-center gap-1.5">
                            <Heart size={14} strokeWidth={2} aria-hidden />
                            <span className="font-semibold">
                              {formatCount(v.reactionCount ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MessageCircle size={14} strokeWidth={2} aria-hidden />
                            <span className="font-semibold">
                              {formatCount(v.commentCount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!poster && src ? (
                        <video className="hidden" src={src} preload="metadata" playsInline />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-center">
                {likedNextCursor ? (
                  <button
                    type="button"
                    onClick={() => loadLikedVideos({ reset: false })}
                    disabled={likedLoading}
                    className={classNames(
                      "rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors",
                      "cursor-pointer",
                      "hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60",
                      "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:active:bg-white/15"
                    )}
                  >
                    {likedLoading ? "Đang tải..." : "Xem thêm"}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-white/60">
                <Heart size={26} strokeWidth={1.75} aria-hidden />
              </div>
              <div className="text-sm font-semibold text-zinc-700 dark:text-white/75">
                {likedLoading ? "Đang tải..." : "Chưa có video đã thích"}
              </div>
              <div className="text-sm text-zinc-500 dark:text-white/55">
                Video bạn đã thích sẽ xuất hiện tại đây.
              </div>
            </div>
          )}
        </div>
      ) : tab === "following" ? (
        <div className="mt-5">
          <UserListModal
            open={true}
            onClose={() => setTab("videos")}
            userId={effectiveUserId}
            type="following"
            title="Đang theo dõi"
          />
        </div>
      ) : tab === "followers" ? (
        <div className="mt-5">
          <UserListModal
            open={true}
            onClose={() => setTab("videos")}
            userId={effectiveUserId}
            type="followers"
            title="Người theo dõi"
          />
        </div>
      ) : null}

      <UserListModal
        open={userListModal.open}
        onClose={() => setUserListModal({ open: false, type: null })}
        userId={effectiveUserId}
        type={userListModal.type}
        title={userListModal.type === "followers" ? "Người theo dõi" : "Đang theo dõi"}
      />

      <VideoViewerPanel
        open={!!selectedVideo}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onCommentCreated={() => {
          // best-effort UI update for profile grid comment count
          setVideos((prev) =>
            prev.map((x) => {
              if (!selectedVideo || x?.id !== selectedVideo.id) return x;
              const cur = typeof x?.commentCount === "number" ? x.commentCount : 0;
              return { ...x, commentCount: cur + 1 };
            })
          );
        }}
      />
    </div>
  );
}

