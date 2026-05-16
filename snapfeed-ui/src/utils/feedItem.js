/**
 * Normalize API payloads to camelCase once at the boundary (feed fetch).
 */
export function normalizeFeedItem(raw) {
  if (!raw || typeof raw !== "object") return raw;
  return {
    id: raw.id,
    user: raw.user,
    title: raw.title ?? "",
    description: raw.description ?? "",
    tags: raw.tags ?? [],
    videoKey: raw.videoKey ?? raw.video_key ?? "",
    thumbnail: raw.thumbnail ?? null,
    duration: raw.duration ?? 0,
    viewCount: raw.viewCount ?? raw.view_count ?? 0,
    commentCount: raw.commentCount ?? raw.comment_count ?? 0,
    reactionCount: raw.reactionCount ?? raw.reaction_count ?? 0,
    myReaction: raw.myReaction ?? raw.my_reaction ?? null,
    isFollowing: raw.isFollowing ?? raw.is_following ?? false,
    userFirstName: raw.userFirstName ?? raw.user_first_name ?? "",
    userLastName: raw.userLastName ?? raw.user_last_name ?? "",
    userAvatar: raw.userAvatar ?? raw.user_avatar ?? null,
    hlsPlaylistKey: raw.hlsPlaylistKey ?? null,
    status: raw.status ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

export function getUserDisplayName(item) {
  const first = String(item.userFirstName ?? "").trim();
  const last = String(item.userLastName ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  if (full) return full;
  return `@user${item.user}`;
}

export function getUserAvatarUrl(item) {
  const url = item.userAvatar;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Normalize PUT /videos/:id/react response (snake_case or camelCase). */
export function normalizeReactApiResponse(raw) {
  if (!raw || typeof raw !== "object") return {};
  return {
    myReaction: raw.reaction ?? null,
    reactionCount: raw.reactionCount ?? raw.reaction_count ?? 0,
  };
}
