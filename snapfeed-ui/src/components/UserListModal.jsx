import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, UserPlus, UserCheck } from "lucide-react";
import { usersApi } from "../api";
import { useAuth } from "../context/AuthContext";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function UserListModal({ open, onClose, userId, type, title }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [followStates, setFollowStates] = useState({});

  const loadUsers = useCallback(
    async ({ reset = false, q = "" } = {}) => {
      if (!userId || !open) return;
      if (loading) return;

      setLoading(true);
      setError("");
      try {
        const apiCall = type === "followers" ? usersApi.followers : usersApi.following;
        const page = await apiCall(userId, {
          q: q.trim(),
          cursor: reset ? null : nextCursor,
        });

        setUsers((prev) => (reset ? page.results : [...prev, ...page.results]));
        setNextCursor(page.nextCursor ?? null);

        // Initialize follow states
        const states = {};
        page.results.forEach((u) => {
          states[u.id] = u.isFollowing ?? u.is_following ?? false;
        });
        setFollowStates((prev) => ({ ...prev, ...states }));
      } catch (e) {
        setError(e?.message || "Không thể tải danh sách.");
      } finally {
        setLoading(false);
      }
    },
    [userId, open, type, loading, nextCursor]
  );

  const handleSearch = useCallback(() => {
    setUsers([]);
    setNextCursor(null);
    loadUsers({ reset: true, q: searchQuery });
  }, [searchQuery, loadUsers]);

  const handleFollow = async (targetUserId, currentState) => {
    try {
      if (currentState) {
        await usersApi.unfollow(targetUserId);
        setFollowStates((prev) => ({ ...prev, [targetUserId]: false }));
      } else {
        await usersApi.follow(targetUserId);
        setFollowStates((prev) => ({ ...prev, [targetUserId]: true }));
      }
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  useEffect(() => {
    if (open) {
      setUsers([]);
      setNextCursor(null);
      setSearchQuery("");
      setFollowStates({});
      loadUsers({ reset: true });
    }
  }, [open, userId, type]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-white/70 dark:hover:bg-white/10"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Tìm kiếm..."
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/50"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
            >
              Tìm
            </button>
          </div>
        </div>

        {/* User List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error ? (
            <div className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          {users.length > 0 ? (
            <div className="divide-y divide-zinc-200 dark:divide-white/10">
              {users.map((u) => {
                const displayName =
                  `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""}`.trim() ||
                  u.username ||
                  "User";
                const avatarUrl = u.avatarUrl || u.avatar_url || "";
                const isFollowing = followStates[u.id] ?? false;

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-5 py-3 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <div
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                      onClick={() => {
                        navigate(`/profile/${u.id}`);
                        onClose();
                      }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-200 dark:bg-white/10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-zinc-900 dark:text-white">
                          {u.username}
                        </div>
                        <div className="truncate text-sm text-zinc-500 dark:text-white/60">
                          {displayName}
                        </div>
                      </div>
                    </div>

                    {currentUser && u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleFollow(u.id, isFollowing)}
                        className={classNames(
                          "ml-3 flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                          isFollowing
                            ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                            : "bg-pink-600 text-white hover:bg-pink-500"
                        )}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck size={16} />
                            Hủy theo dõi
                          </>
                        ) : (
                          <>
                            <UserPlus size={16} />
                            Theo dõi
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-white/60">
              {loading ? "Đang tải..." : "Không có người dùng nào"}
            </div>
          )}

          {nextCursor && !loading ? (
            <div className="border-t border-zinc-200 px-5 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => loadUsers({ reset: false, q: searchQuery })}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Xem thêm
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
