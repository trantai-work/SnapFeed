import { useState, useEffect } from "react";
import { X, Loader2, Calendar } from "lucide-react";
import { supportApi } from "../api";
import { useMessageBox } from "./MessageBox";

export default function SupportResponseModal({ ticketId, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const { show } = useMessageBox();

  useEffect(() => {
    if (!ticketId) return;
    let active = true;
    setLoading(true);
    supportApi.getUserTicket(ticketId)
      .then((data) => {
        if (active) setTicket(data);
      })
      .catch((err) => {
        if (active) {
          show({
            status: "error",
            title: "Lỗi tải chi tiết",
            message: err?.message || "Không thể tải chi tiết yêu cầu hỗ trợ.",
          });
          onClose();
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ticketId, onClose, show]);

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const updated = await supportApi.replyUserTicket(ticketId, replyText);
      setTicket(updated);
      setReplyText("");
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

  if (!ticketId) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default bg-black/45 backdrop-blur-[1px] transition-opacity dark:bg-black/55"
        aria-label="Đóng chi tiết hỗ trợ"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[110] flex w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-[#121212] max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết hỗ trợ</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        ) : ticket ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-black">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Yêu cầu của bạn
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {ticket.description}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(ticket.createdAt).toLocaleString("vi-VN")}
              </div>
            </div>

            {ticket.replies && ticket.replies.length > 0 ? (
              <div className="flex flex-col gap-4">
                {ticket.replies.map((reply) => {
                  const isModerator = reply.senderUsername === ticket.handledByUsername;
                  return (
                    <div
                      key={reply.id}
                      className={`rounded-2xl border p-4 relative ${
                        isModerator
                          ? "border-pink-100 bg-pink-50 dark:border-pink-900/30 dark:bg-pink-900/10"
                          : "border-gray-200 bg-white dark:border-white/10 dark:bg-[#181818]"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {reply.senderAvatarUrl ? (
                          <img
                            src={reply.senderAvatarUrl}
                            alt={reply.senderUsername}
                            className="h-6 w-6 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            {reply.senderUsername?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`text-xs font-semibold uppercase tracking-wider ${
                          isModerator ? "text-pink-600 dark:text-pink-400" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {isModerator ? "Quản trị viên" : reply.senderUsername}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                        {reply.content}
                      </p>
                      <div className={`mt-3 flex items-center gap-1.5 text-xs ${
                        isModerator ? "text-pink-500 dark:text-pink-400/80" : "text-gray-500 dark:text-gray-400"
                      }`}>
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(reply.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-white/10 dark:bg-[#181818]">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Yêu cầu của bạn đang được xem xét. Vui lòng kiên nhẫn chờ phản hồi từ Quản trị viên.
                </p>
              </div>
            )}
            
            {ticket.status !== "closed" && (
              <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/5">
                <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  Gửi phản hồi thêm
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sending}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 disabled:opacity-60 dark:border-zinc-800 dark:bg-black dark:text-white"
                  placeholder="Nhập nội dung phản hồi của bạn..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={!replyText.trim() || sending}
                    onClick={handleReply}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-pink-600 px-5 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Gửi phản hồi
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-12 text-gray-500">
            Không tìm thấy thông tin.
          </div>
        )}
      </div>
    </>
  );
}
