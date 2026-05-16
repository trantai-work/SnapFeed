import { useCallback, useEffect, useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import { feedApi } from "../api/feed.api";
import VideoViewerPanel from "../components/VideoViewerPanel";
import { useAuth } from "../context/AuthContext";
import { openAuthModal } from "../utils/authModalBus";
import { getUserAvatarUrl, getUserDisplayName, normalizeFeedItem } from "../utils/feedItem";

const tabs = [
  { id: "trending", label: "Xu hướng" },
  { id: "following", label: "Đang theo dõi" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function VideoGrid({ videos, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {videos.map((video) => {
        const title = String(video?.title || video?.description || "").trim() || "Video";
        const author = getUserDisplayName(video || {});
        const avatar = getUserAvatarUrl(video || {});

        return (
          <button
            key={video?.id}
            type="button"
            onClick={() => onSelect(video)}
            className="group flex cursor-pointer flex-col gap-2 text-left"
          >
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-200 dark:bg-white/10">
              {video?.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={title}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                  No thumbnail
                </div>
              )}
              <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
                {video?.viewCount || 0} views
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-2">
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
                <div className="line-clamp-2 text-sm font-semibold text-gray-950 dark:text-white">
                  {title}
                </div>
                <div className="truncate text-xs text-gray-500 dark:text-white/50">
                  {author}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function ExplorePage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("trending");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const loadVideos = useCallback(async () => {
    if (activeTab === "following" && !isAuthenticated) {
      setVideos([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data =
        activeTab === "following"
          ? await feedApi.getFollowing()
          : await feedApi.getTrending();
      const raw = Array.isArray(data) ? data : data?.results ?? [];
      setVideos(raw.map(normalizeFeedItem).filter(Boolean));
    } catch (err) {
      setVideos([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    if (!isAuthenticated && activeTab === "following") {
      setActiveTab("trending");
    }
  }, [activeTab, isAuthenticated]);

  const selectTab = (tabId) => {
    if (tabId === "following" && !isAuthenticated) {
      openAuthModal();
      return;
    }
    setActiveTab(tabId);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-black dark:text-white">
      <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-black">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-pink-500 text-white">
              <Compass className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Khám phá</h1>
              <p className="text-sm text-gray-500 dark:text-white/55">
                Video nổi bật và nội dung từ những người bạn theo dõi.
              </p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={classNames(
                    "h-10 shrink-0 cursor-pointer rounded-full px-4 text-sm font-bold transition",
                    active
                      ? "bg-gray-950 text-white dark:bg-white dark:text-black"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-white/10 dark:text-white/75 dark:hover:bg-white/15"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-gray-500 dark:text-white/65">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-white/65">
            Không tải được video.
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-white/65">
            Chưa có video nào.
          </div>
        ) : (
          <VideoGrid videos={videos} onSelect={setSelectedVideo} />
        )}
      </div>

      <VideoViewerPanel
        open={!!selectedVideo}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onCommentCreated={() => {
          setVideos((prev) =>
            prev.map((video) => {
              if (!selectedVideo || video?.id !== selectedVideo.id) return video;
              const count =
                typeof video?.commentCount === "number" ? video.commentCount : 0;
              return { ...video, commentCount: count + 1 };
            })
          );
        }}
      />
    </div>
  );
}
