import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { videosApi } from "../api/video.api";
import { usersApi } from "../api/user.api";
import { getUserAvatarUrl, getUserDisplayName } from "../utils/feedItem";
import VideoViewerPanel from "../components/VideoViewerPanel";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("video");
  const [videoResults, setVideoResults] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoCursor, setVideoCursor] = useState(null);
  const [videoHasMore, setVideoHasMore] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [userResults, setUserResults] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userCursor, setUserCursor] = useState(null);
  const [userHasMore, setUserHasMore] = useState(false);

  useEffect(() => {
    const q = String(query || "").trim();
    if (!q) {
      setVideoResults([]);
      setVideoLoading(false);
      return;
    }

    let alive = true;
    setVideoLoading(true);
    setVideoResults([]);
    setVideoCursor(null);
    setVideoHasMore(false);

    (async () => {
      try {
        const page = await videosApi.search({ keyword: q, size: 20 });
        if (!alive) return;
        setVideoResults(Array.isArray(page?.results) ? page.results : []);
        setVideoCursor(page?.nextCursor || null);
        setVideoHasMore(!!page?.nextCursor);
      } catch {
        if (!alive) return;
        setVideoResults([]);
      } finally {
        if (!alive) return;
        setVideoLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [query]);

  useEffect(() => {
    const q = String(query || "").trim();
    if (!q) {
      setUserResults([]);
      setUserLoading(false);
      return;
    }

    let alive = true;
    setUserLoading(true);
    setUserResults([]);
    setUserCursor(null);
    setUserHasMore(false);

    (async () => {
      try {
        const page = await usersApi.search({ keyword: q, size: 20 });
        if (!alive) return;
        setUserResults(Array.isArray(page?.results) ? page.results : []);
        setUserCursor(page?.nextCursor || null);
        setUserHasMore(!!page?.nextCursor);
      } catch {
        if (!alive) return;
        setUserResults([]);
      } finally {
        if (!alive) return;
        setUserLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [query]);

  const loadMoreVideos = async () => {
    if (!videoCursor || videoLoading) return;
    setVideoLoading(true);
    try {
      const page = await videosApi.search({ keyword: query, cursor: videoCursor, size: 20 });
      setVideoResults((prev) => [
        ...prev,
        ...(Array.isArray(page?.results) ? page.results : []),
      ]);
      setVideoCursor(page?.nextCursor || null);
      setVideoHasMore(!!page?.nextCursor);
    } catch {
      // ignore
    } finally {
      setVideoLoading(false);
    }
  };

  const loadMoreUsers = async () => {
    if (!userCursor || userLoading) return;
    setUserLoading(true);
    try {
      const page = await usersApi.search({ keyword: query, cursor: userCursor, size: 20 });
      setUserResults((prev) => [
        ...prev,
        ...(Array.isArray(page?.results) ? page.results : []),
      ]);
      setUserCursor(page?.nextCursor || null);
      setUserHasMore(!!page?.nextCursor);
    } catch {
      // ignore
    } finally {
      setUserLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-black dark:text-white">
      <div className="border-b border-gray-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="mb-4 text-2xl font-bold">
            Kết quả tìm kiếm: <span className="text-pink-500">{query}</span>
          </h1>
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("video")}
              className={`cursor-pointer border-b-2 pb-2 text-sm font-semibold transition ${
                activeTab === "video"
                  ? "border-pink-500 text-pink-500"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("user")}
              className={`cursor-pointer border-b-2 pb-2 text-sm font-semibold transition ${
                activeTab === "user"
                  ? "border-pink-500 text-pink-500"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Người dùng
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {activeTab === "video" ? (
          <>
            {videoLoading && videoResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Đang tìm kiếm...</div>
            ) : videoResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Không có kết quả.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {videoResults.map((v) => {
                    const title = String(v?.description || v?.title || "").trim() || "Video";
                    const author = getUserDisplayName(v || {});
                    const avatar = getUserAvatarUrl(v || {});
                    return (
                      <button
                        key={v?.id}
                        type="button"
                        onClick={() => setSelectedVideo(v)}
                        className="group flex cursor-pointer flex-col gap-2 text-left"
                      >
                        <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-200 dark:bg-white/10">
                          {v?.thumbnail ? (
                            <img
                              src={v.thumbnail}
                              alt={title}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              No thumbnail
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                            {v?.viewCount || 0} views
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-300 dark:bg-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-semibold">{title}</div>
                            <div className="truncate text-xs text-gray-500 dark:text-white/50">
                              {author}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {videoHasMore ? (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={loadMoreVideos}
                      disabled={videoLoading}
                      className="rounded-full bg-pink-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
                    >
                      {videoLoading ? "Đang tải..." : "Xem thêm"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            {userLoading && userResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Đang tìm kiếm...</div>
            ) : userResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500">Không có kết quả.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {userResults.map((u) => {
                    const displayName =
                      `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                      u?.username ||
                      "User";
                    const username = u?.username || "";
                    const avatar = u?.avatarUrl || u?.avatar_url || "";
                    return (
                      <button
                        key={u?.id}
                        type="button"
                        onClick={() => navigate(`/profile/${u?.id}`)}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-pink-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/50"
                      >
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={username}
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-white/10" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{displayName}</div>
                          <div className="truncate text-xs text-gray-500 dark:text-white/50">
                            @{username}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {userHasMore ? (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={loadMoreUsers}
                      disabled={userLoading}
                      className="rounded-full bg-pink-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
                    >
                      {userLoading ? "Đang tải..." : "Xem thêm"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </div>

      <VideoViewerPanel
        open={!!selectedVideo}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onCommentCreated={() => {
          setVideoResults((prev) =>
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
