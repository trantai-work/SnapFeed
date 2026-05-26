import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileText, Calendar, Plus, MessageSquare, ArrowLeft, Send } from "lucide-react";
import { supportApi } from "../api";
import { useMessageBox } from "../components/MessageBox";
import SupportModal from "../components/SupportModal";
import { formatRelativeTimeVi } from "../utils/format";
import { useRealtimeSocket } from "../context/RealtimeSocketContext";
import { useAuth } from "../context/AuthContext";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SupportHistoryPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { show } = useMessageBox();

  const { user } = useAuth();
  const { subscribe } = useRealtimeSocket();

  // Ticket Detail State
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const ticketsRef = useRef(tickets);
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    const unsubCreated = subscribe("support.ticket_created", (payload) => {
      const { ticket } = payload || {};
      if (!ticket) return;
      setTickets((prev) => {
        const exists = prev.some((t) => t.id === ticket.id);
        if (exists) return prev;
        return [ticket, ...prev];
      });
    });

    const unsubReply = subscribe("support.reply_created", (payload) => {
      const { reply, ticketId } = payload || {};
      if (!reply || !ticketId) return;

      // Show toast if sender is not the current user
      if (reply.senderUsername !== user?.username) {
        const ticket = ticketsRef.current.find((t) => t.id === ticketId);
        show({
          status: "info",
          title: "Phản hồi mới",
          message: `Quản trị viên đã phản hồi yêu cầu "${ticket?.title || 'hỗ trợ'}"`,
        });
      }

      // Update active ticket details
      setTicketDetail((prev) => {
        if (!prev || prev.id !== ticketId) return prev;
        const exists = prev.replies?.some((r) => r.id === reply.id);
        if (exists) return prev;
        return {
          ...prev,
          replies: [...(prev.replies || []), reply],
        };
      });

      // Update ticket in the list
      setTickets((prev) => {
        return prev.map((t) => {
          if (t.id !== ticketId) return t;
          return {
            ...t,
            updatedAt: reply.createdAt || t.updatedAt,
          };
        });
      });
    });

    const unsubUpdated = subscribe("support.ticket_updated", (payload) => {
      const { ticket } = payload || {};
      if (!ticket) return;

      setTickets((prev) => {
        const exists = prev.some((t) => t.id === ticket.id);
        if (!exists) return [ticket, ...prev];
        return prev.map((t) => (t.id === ticket.id ? { ...t, ...ticket } : t));
      });

      setTicketDetail((prev) => {
        if (!prev || prev.id !== ticket.id) return prev;
        return {
          ...prev,
          ...ticket,
          replies: ticket.replies !== undefined ? ticket.replies : prev.replies,
        };
      });
    });

    return () => {
      unsubCreated?.();
      unsubReply?.();
      unsubUpdated?.();
    };
  }, [subscribe, user?.username, show]);

  const loadTickets = useCallback(async (preserveSelection = false) => {
    if (!preserveSelection) setLoading(true);
    try {
      const data = await supportApi.listUserTickets();
      setTickets(data.results || []);
    } catch (err) {
      if (!preserveSelection) {
        show({
          status: "error",
          title: "Lỗi tải lịch sử",
          message: err?.message || "Không thể tải lịch sử hỗ trợ lúc này.",
        });
      }
    } finally {
      if (!preserveSelection) setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicketId) {
      setTicketDetail(null);
      setReplyText("");
      return;
    }
    let active = true;
    setDetailLoading(true);
    supportApi.getUserTicket(selectedTicketId)
      .then((data) => {
        if (active) setTicketDetail(data);
      })
      .catch((err) => {
        if (active) {
          show({
            status: "error",
            title: "Lỗi tải chi tiết",
            message: err?.message || "Không thể tải chi tiết yêu cầu hỗ trợ.",
          });
          setSelectedTicketId(null);
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTicketId, show]);

  const handleReply = async () => {
    if (!replyText.trim() || sending || !selectedTicketId) return;
    setSending(true);
    try {
      const updated = await supportApi.replyUserTicket(selectedTicketId, replyText);
      setTicketDetail(updated);
      setReplyText("");
      loadTickets(true);
    } catch (err) {
      show({
        status: "error",
        title: "Gửi thất bại",
        message: err?.message || "Không thể gửi phản hồi lúc này.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f5f5f5] dark:bg-[#121212] lg:h-full">


      <main className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 sm:px-6 lg:grid-cols-[minmax(30rem,40%)_minmax(0,1fr)]">
        {/* Left Pane: Ticket List */}
        <div className={classNames(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e7e5e4] dark:border-white/10 bg-white dark:bg-[#18181b] shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
          selectedTicketId ? "hidden lg:flex" : "flex"
        )}>
          <div className="flex items-center justify-between border-b border-[#e7e5e4] dark:border-white/10 p-4 shrink-0">
            <h2 className="text-lg font-bold text-[#0c0a09] dark:text-white">Lịch sử hỗ trợ</h2>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="cursor-pointer flex h-8 items-center gap-1.5 rounded-full bg-[#292524] dark:bg-white px-3 text-xs font-semibold text-white dark:text-[#18181b] transition hover:bg-[#0c0a09] dark:hover:bg-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="grid min-h-full place-items-center text-[#777169] dark:text-zinc-400">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : tickets.length > 0 ? (
              <div className="flex flex-col gap-2">
                {tickets.map((ticket) => {
                  const active = selectedTicketId === ticket.id;
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={classNames(
                        "flex w-full cursor-pointer gap-3 rounded-2xl border p-3 text-left transition",
                        active
                          ? "border-[#292524] dark:border-white/30 bg-[#fafafa] dark:bg-white/5"
                          : "border-[#e7e5e4] dark:border-white/10 bg-white dark:bg-[#18181b] hover:bg-[#fafafa] dark:hover:bg-white/5 dark:bg-white/5"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-sm font-medium text-[#0c0a09] dark:text-white">
                            {ticket.title}
                          </div>
                          <span className={classNames(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            ticket.status === "pending" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                              ticket.status === "replied" ? "bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400" :
                                "bg-[#f0efed] dark:bg-white/5 text-[#777169] dark:text-zinc-400"
                          )}>
                            {ticket.status === "pending" ? "Đang chờ" : ticket.status === "replied" ? "Đang xử lý" : "Đã đóng"}
                          </span>
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs text-[#777169] dark:text-zinc-400">
                          {ticket.description}
                        </div>
                        <div className="mt-1 truncate text-[11px] font-medium text-[#a8a29e] dark:text-zinc-500">
                          {ticket.createdAt ? formatRelativeTimeVi(ticket.createdAt) : "Unknown"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-full place-items-center px-4 text-center text-sm text-[#777169] dark:text-zinc-400">
                <div className="flex flex-col items-center">
                  <FileText className="mb-2 h-8 w-8 text-[#d6d3d1]" />
                  <p>Bạn chưa có yêu cầu hỗ trợ nào.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Ticket Detail / Thread */}
        <div className={classNames(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e7e5e4] dark:border-white/10 bg-white dark:bg-[#18181b] shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
          !selectedTicketId ? "hidden lg:flex" : "flex"
        )}>
          {selectedTicketId ? (
            detailLoading ? (
              <div className="flex flex-1 items-center justify-center text-[#777169] dark:text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : ticketDetail ? (
              <>
                <div className="flex items-center gap-3 border-b border-[#e7e5e4] dark:border-white/10 p-4 lg:p-5 shrink-0">
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="cursor-pointer rounded-full p-1 text-[#777169] dark:text-zinc-400 hover:bg-[#f0efed] dark:hover:bg-white/10 dark:bg-white/5 lg:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-[#f0efed] dark:bg-white/5">
                      {ticketDetail.userAvatarUrl ? (
                        <img
                          src={ticketDetail.userAvatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm font-bold text-[#777169] dark:text-zinc-400">
                          {ticketDetail.userUsername ? ticketDetail.userUsername.charAt(0).toUpperCase() : <MessageSquare className="h-5 w-5" />}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[#0c0a09] dark:text-white">
                        {ticketDetail.userUsername ? `@${ticketDetail.userUsername}` : "Bạn"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#777169] dark:text-zinc-400">
                        <Calendar className="h-3 w-3" />
                        {ticketDetail.createdAt ? new Date(ticketDetail.createdAt).toLocaleString("vi-VN") : "Unknown Date"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-5">
                  <h2 className="text-xl font-bold text-[#0c0a09] dark:text-white">{ticketDetail.title}</h2>
                  <div className="mt-2 mb-6 whitespace-pre-wrap text-sm text-[#4e4e4e] dark:text-zinc-300">{ticketDetail.description}</div>

                  <div className="mb-4 flex items-center justify-between border-t border-[#e7e5e4] dark:border-white/10 pt-5">
                    <h3 className="font-semibold text-[#0c0a09] dark:text-white">Lịch sử trao đổi</h3>
                  </div>

                  {ticketDetail.replies && ticketDetail.replies.length > 0 && (
                    <div className="mb-6 flex flex-col gap-4">
                      {ticketDetail.replies.map((reply) => {
                        const isModerator = reply.senderUsername === ticketDetail.handledByUsername || reply.senderUsername !== ticketDetail.userUsername;
                        return (
                          <div
                            key={reply.id}
                            className={`rounded-2xl border p-4 ${isModerator
                                ? "border-[#e7e5e4] dark:border-white/10 bg-[#f0efed]/50 dark:bg-white/5"
                                : "border-[#e7e5e4] dark:border-white/10 bg-white dark:bg-[#18181b]"
                              }`}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#d6d3d1] dark:bg-white/20">
                                {reply.senderAvatarUrl ? (
                                  <img
                                    src={reply.senderAvatarUrl}
                                    alt={reply.senderUsername}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white dark:text-[#18181b]">
                                    {reply.senderUsername?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className={`text-xs font-semibold ${isModerator ? "text-[#0c0a09] dark:text-white" : "text-[#777169] dark:text-zinc-400"}`}>
                                {isModerator ? `Quản trị viên (@${reply.senderUsername})` : `Bạn (@${reply.senderUsername})`}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-[#0c0a09] dark:text-white">
                              {reply.content}
                            </p>
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#777169] dark:text-zinc-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {reply.createdAt ? new Date(reply.createdAt).toLocaleString("vi-VN") : "Unknown Date"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {ticketDetail.status !== "closed" ? (
                  <div className="border-t border-[#e7e5e4] dark:border-white/10 bg-white dark:bg-[#18181b] p-4 shrink-0">
                    <div className="flex gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={sending}
                        rows={1}
                        className="min-h-[44px] w-full overflow-hidden resize-none rounded-2xl border border-[#d6d3d1] dark:border-white/20 bg-[#f0efed]/50 dark:bg-white/5 p-3 text-sm text-[#0c0a09] dark:text-white placeholder:text-[#a8a29e] dark:text-zinc-500 focus:border-[#292524] dark:border-white/30 focus:bg-white dark:bg-[#18181b] focus:outline-none focus:ring-1 focus:ring-[#292524] disabled:opacity-50"
                        placeholder="Nhập nội dung phản hồi..."
                        style={{ height: "44px" }}
                        onInput={(e) => {
                          e.target.style.height = "44px";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                      />
                      <button
                        type="button"
                        disabled={!replyText.trim() || sending}
                        onClick={handleReply}
                        className="cursor-pointer flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#292524] dark:bg-white text-white dark:text-[#18181b] transition hover:bg-[#0c0a09] dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-[#e7e5e4] dark:border-white/10 bg-[#f0efed] dark:bg-white/5 p-4 text-center shrink-0">
                    <p className="text-sm text-[#777169] dark:text-zinc-400">
                      Yêu cầu này đã được đóng. Bạn không thể phản hồi thêm.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-[#777169] dark:text-zinc-400">
                Không tìm thấy thông tin.
              </div>
            )
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center p-8 text-center lg:flex">
              <MessageSquare className="mb-4 h-12 w-12 text-[#d6d3d1]" />
              <h3 className="text-lg font-medium text-[#0c0a09] dark:text-white">Chọn yêu cầu</h3>
              <p className="mt-2 text-sm text-[#777169] dark:text-zinc-400">
                Nhấn vào một yêu cầu bên trái để xem chi tiết và phản hồi.
              </p>
            </div>
          )}
        </div>
      </main>

      <SupportModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          loadTickets(true);
        }}
      />
    </div>
  );
}
