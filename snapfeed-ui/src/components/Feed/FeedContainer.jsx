import { Loader2 } from "lucide-react";
import { useFeedItems } from "../../hooks/useFeedItems";
import { FeedList } from "./FeedList";

const shellClass =
  "flex h-[calc(100dvh-7rem)] min-h-[320px] items-center justify-center";

export default function FeedContainer() {
  const { items, loading, error, loadMore } = useFeedItems();

  if (loading) {
    return (
      <div className={`${shellClass} text-white/80`}>
        <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div
        className={`${shellClass} flex-col gap-4 text-center text-white`}
      >
        <p className="text-sm text-white/80">Không tải được feed.</p>
        <button
          type="button"
          className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={`${shellClass} text-sm text-white/70`}>
        Chưa có video nào.
      </div>
    );
  }

  return (
    <FeedList
      items={items}
      onEndReached={loadMore}
    />
  );
}
