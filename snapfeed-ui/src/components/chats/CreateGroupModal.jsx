import { useEffect, useState, useCallback, useRef } from "react";
import { X, Search, Loader2, UserPlus, Check } from "lucide-react";
import { usersApi, conversationsApi } from "../../api";
import ConversationAvatar from "./ConversationAvatar";
import { fullName } from "../../utils/chat";

export default function CreateGroupModal({ open, onClose, meId, onGroupCreated }) {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Load default list of following users when query is empty
  const loadDefaultUsers = useCallback(async () => {
    if (!meId) return;
    setLoading(true);
    try {
      const data = await usersApi.following(meId, { q: "" });
      const results = Array.isArray(data?.results) ? data.results : [];
      setUsers(results);
    } catch (e) {
      console.error("Failed to load following list", e);
    } finally {
      setLoading(false);
    }
  }, [meId]);

  // Search users based on query
  const searchUsers = useCallback(async (query) => {
    setLoading(true);
    try {
      const data = await usersApi.search({ keyword: query, size: 20 });
      const results = Array.isArray(data?.results) ? data.results : [];
      // Filter out self
      const filtered = results.filter((u) => Number(u.id) !== Number(meId));
      setUsers(filtered);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  }, [meId]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setSearchQuery("");
      setSelectedUsers([]);
      setUsers([]);
      loadDefaultUsers();
    }
  }, [open, loadDefaultUsers]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      loadDefaultUsers();
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(value.trim());
    }, 450);
  };

  const toggleUserSelection = (user) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    if (isSelected) {
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      alert("Vui lòng nhập tên nhóm.");
      return;
    }
    if (selectedUsers.length === 0) {
      alert("Vui lòng chọn ít nhất 1 thành viên để tạo nhóm.");
      return;
    }

    setSubmitting(true);
    try {
      const userIds = selectedUsers.map((u) => u.id);
      const newGroup = await conversationsApi.group({
        title: title.trim(),
        userIds,
      });
      if (typeof onGroupCreated === "function") {
        onGroupCreated(newGroup);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Không thể tạo nhóm: " + (err?.message || "Lỗi hệ thống"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-[620px] max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-150 p-4 dark:border-white/10">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Tạo nhóm mới</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex min-h-0 flex-1 flex-col p-4 gap-4">
          {/* Group Title input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Tên nhóm <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên nhóm..."
              maxLength={100}
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-sm focus:border-pink-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-pink-500"
            />
          </div>

          {/* Search Member input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Thêm thành viên</label>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-zinc-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm theo tên hoặc username..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9.5 pr-3.5 text-sm text-zinc-900 shadow-sm focus:border-pink-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-pink-500"
              />
            </div>
          </div>

          {/* Selected Chip Row */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pb-1 border-b border-zinc-100 dark:border-white/5">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1 rounded-full bg-pink-50 dark:bg-pink-500/10 border border-pink-100 dark:border-pink-500/20 py-0.5 pl-1.5 pr-1 text-xs text-pink-700 dark:text-pink-300"
                >
                  <span className="truncate max-w-[100px] font-semibold">
                    {fullName(user) || user.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleUserSelection(user)}
                    className="rounded-full p-0.5 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-500 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Users List Container */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-150 dark:border-white/10 rounded-xl">
            {loading ? (
              <div className="flex h-full items-center justify-center py-6 text-zinc-500 dark:text-white/60">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-xs font-semibold">Đang tìm kiếm...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 px-4 text-center text-zinc-500 dark:text-white/55">
                <UserPlus size={24} className="mb-2 text-zinc-400" />
                <p className="text-xs font-semibold">Không tìm thấy người dùng nào</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Hãy thử gõ tên khác hoặc kiểm tra lại từ khóa.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-white/5">
                {users.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                  const nameStr = fullName(user);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className="flex cursor-pointer items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ConversationAvatar
                          conv={{
                            type: "direct",
                            participants: [{ id: user.id, ...user }],
                          }}
                          meId={meId}
                          className="h-9 w-9 shrink-0"
                        />
                        <div className="min-w-0 flex-1 flex flex-col">
                          <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                            {nameStr || `@${user.username}`}
                          </span>
                          {nameStr && (
                            <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                              @{user.username}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Checkbox badge */}
                      <div
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                          isSelected
                            ? "border-pink-500 bg-pink-500 text-white dark:border-pink-600 dark:bg-pink-600"
                            : "border-zinc-300 dark:border-white/20",
                        ].join(" ")}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5 active:scale-95 transition-transform"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || selectedUsers.length === 0 || !title.trim()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-700 px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                `Tạo nhóm (${selectedUsers.length})`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
