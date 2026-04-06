/**
 * Normalize notification list row (camelCase or snake_case from API).
 */
export function normalizeNotificationRecipient(raw) {
  if (!raw || typeof raw !== "object") return null;
  const n = raw.notification;
  if (!n || typeof n !== "object") return null;

  const actorRaw = n.actor;
  const actor =
    actorRaw && typeof actorRaw === "object"
      ? {
          id: actorRaw.id,
          username: actorRaw.username ?? "",
          firstName: actorRaw.firstName ?? actorRaw.first_name ?? "",
          lastName: actorRaw.lastName ?? actorRaw.last_name ?? "",
          avatarUrl: actorRaw.avatarUrl ?? actorRaw.avatar_url ?? null,
        }
      : null;

  return {
    id: raw.id,
    isRead: raw.isRead ?? raw.is_read ?? false,
    readAt: raw.readAt ?? raw.read_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    notification: {
      id: n.id,
      category: n.category ?? "",
      title: n.title ?? "",
      message: n.message ?? "",
      createdAt: n.createdAt ?? n.created_at ?? null,
      actor,
      target: n.target ?? null,
    },
  };
}

export function formatNotificationTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMs = now - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/** Extract cursor query value from DRF cursor `next` URL. */
export function cursorFromNextLink(next) {
  if (!next || typeof next !== "string") return null;
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = next.startsWith("http") ? new URL(next) : new URL(next, base);
    return u.searchParams.get("cursor");
  } catch {
    return null;
  }
}
