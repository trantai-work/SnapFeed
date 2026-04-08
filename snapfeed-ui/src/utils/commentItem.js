export function normalizeComment(raw) {
  if (!raw || typeof raw !== "object") return null;
  const user = raw.user || raw.user_info || null;
  return {
    id: raw.id,
    video: raw.video ?? null,
    user: user
      ? {
          id: user.id,
          username: user.username ?? "",
          email: user.email ?? "",
          firstName: user.firstName ?? user.first_name ?? "",
          lastName: user.lastName ?? user.last_name ?? "",
          avatarUrl: user.avatarUrl ?? user.avatar_url ?? "",
        }
      : null,
    content: raw.content ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

