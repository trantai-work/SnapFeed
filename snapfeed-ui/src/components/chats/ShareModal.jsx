import { useCallback, useEffect, useState } from "react";
import { Search, X, Send, Check } from "lucide-react";
import { conversationsApi } from "../../api/conversations.api";
import { messagesApi } from "../../api/messages.api";
import { useAuth } from "../../context/AuthContext";
import { buildConversationName } from "../../utils/chat";
import ConversationAvatar from "./ConversationAvatar";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ShareModal({ open, onClose, video }) {
  const { isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sendStates, setSendStates] = useState({}); // { [convId]: "idle" | "sending" | "sent" }

  const loadConversations = useCallback(async () => {
    if (!open || !isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      const res = await conversationsApi.list({ pageSize: 50 });
      setConversations(res.results || []);
    } catch (e) {
      setError(e?.message || "Không thể tải danh sách cuộc trò chuyện.");
    } finally {
      setLoading(false);
    }
  }, [open, isAuthenticated]);

  useEffect(() => {
    if (open) {
      setConversations([]);
      setSendStates({});
      setSearchQuery("");
      loadConversations();
    }
  }, [open, loadConversations]);

  const handleSend = async (convId) => {
    if (sendStates[convId] === "sending" || sendStates[convId] === "sent") return;
    setSendStates((prev) => ({ ...prev, [convId]: "sending" }));
    try {
      await messagesApi.create({
        conversationId: convId,
        sharedVideoId: video.id,
      });
      setSendStates((prev) => ({ ...prev, [convId]: "sent" }));
    } catch (e) {
      console.error(e);
      alert("Không thể gửi video: " + (e?.message || "Lỗi hệ thống"));
      setSendStates((prev) => ({ ...prev, [convId]: "idle" }));
    }
  };

  if (!open || !video) return null;

  // Filter conversations locally based on title or participant names
  const filteredConversations = conversations.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    // Check conversation title
    if (c.title && c.title.toLowerCase().includes(query)) return true;

    // Check participants' names
    if (Array.isArray(c.participants)) {
      return c.participants.some((p) => {
        const pName = `${p.firstName || p.first_name || ""} ${p.lastName || p.last_name || ""}`.trim().toLowerCase();
        const pUsername = (p.username || "").toLowerCase();
        return pName.includes(query) || pUsername.includes(query);
      });
    }
    return false;
  });

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-white/10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Gửi đến cuộc trò chuyện</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 dark:text-white/70 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-white/10">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="max-h-[50vh] overflow-y-auto min-h-[150px]">
          {error ? (
            <div className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          {filteredConversations.length > 0 ? (
            <div className="divide-y divide-zinc-200 dark:divide-white/10">
              {filteredConversations.map((c) => {
                // Determine display avatar and title of the conversation
                const displayTitle = buildConversationName(c, user?.id);
                const sendState = sendStates[c.id] || "idle";

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-5 py-3 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <ConversationAvatar conv={c} meId={user?.id} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-zinc-900 dark:text-white text-sm">
                          {displayTitle}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSend(c.id)}
                      disabled={sendState !== "idle"}
                      className={classNames(
                        "ml-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition min-w-[76px]",
                        sendState === "sent"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : sendState === "sending"
                          ? "bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-white/30 cursor-not-allowed"
                          : "bg-pink-600 text-white hover:bg-pink-500"
                      )}
                    >
                      {sendState === "sent" ? (
                        <>
                          <Check size={14} />
                          Đã gửi
                        </>
                      ) : sendState === "sending" ? (
                        "Đang gửi..."
                      ) : (
                        <>
                          <Send size={14} />
                          Gửi
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-white/60">
              {loading ? "Đang tải..." : "Không tìm thấy cuộc trò chuyện nào"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
