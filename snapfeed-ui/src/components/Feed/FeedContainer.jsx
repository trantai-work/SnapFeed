import { Loader2 } from "lucide-react";
import { useFeedItems } from "../../hooks/useFeedItems";
import { FeedList } from "./FeedList";

const shellClass =
  "flex box-border h-[min(100svh,100dvh)] max-h-[min(100svh,100dvh)] min-h-[280px] items-center justify-center lg:h-[calc(100dvh-7rem)] lg:max-h-none";

export default function FeedContainer() {
  const { items, loading, error, loadMore, updateFeedVideo } = useFeedItems();

  if (loading) {
    return (
      <div className={`${shellClass} text-gray-500 dark:text-white/80`}>
        <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div
        className={`${shellClass} flex-col gap-4 text-center text-gray-800 dark:text-white`}
      >
        <p className="text-sm text-gray-600 dark:text-white/80">Không tải được feed.</p>
        <button
          type="button"
          className="rounded-full bg-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={`${shellClass} text-sm text-gray-600 dark:text-white/70`}>
        Chưa có video nào.
      </div>
    );
  }

  return (
    <FeedList
      items={items}
      onEndReached={loadMore}
      onReactionUpdate={updateFeedVideo}
    />
  );
}
