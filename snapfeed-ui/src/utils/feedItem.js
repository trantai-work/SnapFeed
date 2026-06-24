import defaultAvatar from "../assets/user.png";

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
    similarityScore: raw.similarityScore ?? raw.similarity_score ?? 0,
    engagementScore: raw.engagementScore ?? raw.engagement_score ?? 0,
    recencyScore: raw.recencyScore ?? raw.recency_score ?? 0,
    totalScore: raw.totalScore ?? raw.total_score ?? 0,
    isDefaultFeed: raw.isDefaultFeed ?? raw.is_default_feed ?? false,
  };
}

export function getUserDisplayName(item) {
  if (!item) return "";
  const first = String(item.userFirstName ?? item.user_first_name ?? (typeof item.user === "object" ? (item.user?.firstName ?? item.user?.first_name) : "") ?? "").trim();
  const last = String(item.userLastName ?? item.user_last_name ?? (typeof item.user === "object" ? (item.user?.lastName ?? item.user?.last_name) : "") ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  if (full) return full;
  const username = typeof item.user === "object" ? (item.user?.username) : null;
  if (username) return username;
  const userId = typeof item.user === "object" ? item.user?.id : item.user;
  return `@user${userId ?? ""}`;
}

export function getUserAvatarUrl(item) {
  if (!item) return defaultAvatar;
  const url = item.userAvatar ?? 
              item.user_avatar ?? 
              item.avatarUrl ?? 
              item.avatar_url ?? 
              item.avatar ?? 
              (typeof item.user === "object" ? (item.user?.avatarUrl ?? item.user?.avatar_url ?? item.user?.avatar) : null);
  return typeof url === "string" && url.length > 0 ? url : defaultAvatar;
}

/** Normalize PUT /videos/:id/react response (snake_case or camelCase). */
export function normalizeReactApiResponse(raw) {
  if (!raw || typeof raw !== "object") return {};
  return {
    myReaction: raw.reaction ?? null,
    reactionCount: raw.reactionCount ?? raw.reaction_count ?? 0,
  };
}
