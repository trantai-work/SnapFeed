import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquare, User, X } from "lucide-react";
import { notificationsApi } from "../api/notifications.api";
import { formatNotificationTime } from "../utils/notificationItem";

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "react", label: "Cảm xúc" },
  { id: "comment", label: "Bình luận" },
  { id: "system", label: "Hệ thống" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function actorInitials(actor) {
  if (!actor) return "";
  const f = String(actor.firstName ?? "").trim();
  const l = String(actor.lastName ?? "").trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  const u = String(actor.username ?? "").trim();
  if (u) return u.slice(0, 2).toUpperCase();
  return "?";
}

function ActorAvatar({ actor }) {
  const url = actor?.avatarUrl;
  const ring = "ring-2 ring-zinc-200 dark:ring-zinc-600";

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={classNames("h-11 w-11 shrink-0 rounded-full object-cover", ring)}
        referrerPolicy="no-referrer"
      />
    );
  }

  const initials = actorInitials(actor);
  return (
    <span
      className={classNames(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        ring,
        "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
      )}
      aria-hidden
    >
      {initials || <User className="h-5 w-5 opacity-70" strokeWidth={1.75} />}
    </span>
  );
}

export default function NotificationsPanel({ onClose }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const scrollRef = useRef(null);
  const loadMoreLock = useRef(false);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((row) => row.notification.category === filter);
  }, [items, filter]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { results, nextCursor: next } = await notificationsApi.list();
      setItems(results);
      setNextCursor(next);
    } catch (e) {
      setError(e);
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    try {
      const { results, nextCursor: next } = await notificationsApi.list({
        cursor: nextCursor,
      });
      setItems((prev) => [...prev, ...results]);
      setNextCursor(next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !nextCursor || loadingMore || loading) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) loadMore();
  }, [nextCursor, loadingMore, loading, loadMore]);

  const activeChip =
    "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-black";
  const inactiveChip =
    "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700";

  const filterLabel =
    FILTERS.find((f) => f.id === filter)?.label ?? "Thông báo";

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

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-0 py-3 sm:py-4"
      >
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-9 w-9 animate-spin" aria-hidden />
            <p className="text-sm">Đang tải thông báo…</p>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              Không tải được thông báo. Thử lại sau.
            </p>
            <button
              type="button"
              onClick={() => loadInitial()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
            >
              Thử lại
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex max-w-sm flex-col items-center self-center px-2 py-10 text-center sm:py-14">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 dark:border-zinc-600 dark:text-zinc-500 sm:h-28 sm:w-28"
              aria-hidden
            >
              <MessageSquare className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={1.25} />
            </div>
            <p className="mt-6 text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              {filter === "all" ? "Chưa có thông báo" : filterLabel}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">
              {filter === "all"
                ? "Các thông báo về tài khoản của bạn sẽ xuất hiện tại đây."
                : "Không có thông báo trong mục này."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5 sm:gap-2" aria-label="Danh sách thông báo">
            {visibleItems.map((row) => {
              const n = row.notification;
              const unread = !row.isRead;
              const timeSrc = n.createdAt || row.createdAt;
              const timeLabel = formatNotificationTime(timeSrc);

              return (
                <li key={row.id}>
                  <article
                    tabIndex={0}
                    className={classNames(
                      "flex cursor-pointer gap-3 rounded-xl px-3 py-3 outline-none transition-colors sm:gap-3.5 sm:px-3.5",
                      unread
                        ? "border-l-[3px] border-sky-500 bg-sky-50/90 hover:bg-sky-100/95 dark:border-sky-400 dark:bg-sky-950/35 dark:hover:bg-sky-900/55"
                        : "border-l-[3px] border-transparent bg-zinc-50/60 opacity-90 hover:bg-zinc-100/95 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/75",
                      "focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
                    )}
                  >
                    <div className="pt-0.5">
                      <ActorAvatar actor={n.actor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <h2
                          className={classNames(
                            "text-sm font-semibold sm:text-[0.9375rem]",
                            unread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-zinc-300"
                          )}
                        >
                          {n.title}
                        </h2>
                        <time
                          className="shrink-0 text-[0.7rem] text-zinc-500 dark:text-zinc-500 sm:text-xs"
                          dateTime={timeSrc ?? undefined}
                        >
                          {timeLabel}
                        </time>
                      </div>
                      <p
                        className={classNames(
                          "mt-1 text-sm leading-snug sm:text-[0.9375rem]",
                          unread
                            ? "text-gray-800 dark:text-zinc-200"
                            : "text-gray-600 dark:text-zinc-400"
                        )}
                      >
                        {n.message}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {loadingMore ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
