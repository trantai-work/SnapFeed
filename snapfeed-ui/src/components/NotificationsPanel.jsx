import { useEffect, useState } from "react";
import { X, MessageSquare } from "lucide-react";

const FILTERS = [
  { id: "all", label: "Tất cả hoạt động" },
  { id: "like", label: "Thích" },
  { id: "comment", label: "Bình luận" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function NotificationsPanel({ onClose }) {
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const activeChip =
    "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-black";
  const inactiveChip =
    "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700";

  const emptyTitle =
    FILTERS.find((f) => f.id === filter)?.label ?? "Tất cả hoạt động";

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col bg-white px-4 pb-4 pt-4 text-gray-900 dark:bg-black dark:text-white sm:px-5 sm:pt-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-panel-title"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 pb-4 pt-0.5 sm:pt-0">
        <h1
          id="notifications-panel-title"
          className="text-xl font-bold tracking-tight sm:text-2xl"
        >
          Thông báo
        </h1>
        <button
          type="button"
          onClick={onClose}
          className={classNames(
            "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full",
            "bg-zinc-200/90 text-zinc-700 transition-colors hover:bg-zinc-300",
            "dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-zinc-700"
          )}
          aria-label="Đóng thông báo"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      <div className="shrink-0 border-b border-gray-200 pb-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={classNames(
                "cursor-pointer rounded-full px-3 py-2 text-left text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                filter === id ? activeChip : inactiveChip
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 py-10 sm:py-14">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 dark:border-zinc-600 dark:text-zinc-500 sm:h-28 sm:w-28"
            aria-hidden
          >
            <MessageSquare className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={1.25} />
          </div>
          <p className="mt-6 text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
            {emptyTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">
            Các thông báo về tài khoản của bạn sẽ xuất hiện tại đây.
          </p>
        </div>
      </div>
    </div>
  );
}
