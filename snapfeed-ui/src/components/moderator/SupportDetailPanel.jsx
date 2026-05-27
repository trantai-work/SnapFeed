import { useState, useEffect } from "react";
import { Loader2, MessageSquare, ExternalLink, Calendar, CheckCircle } from "lucide-react";
import { formatRelativeTimeVi } from "../../utils/format";
import { classNames } from "./moderatorHelpers";

export default function SupportDetailPanel({
  selectedTicket,
  replyContent,
  setReplyContent,
  saving,
  onUpdateStatus,
}) {
  if (!selectedTicket) {
    return (
      <section className="hidden flex-col items-center justify-center rounded-3xl border border-[#e7e5e4] bg-white p-8 text-center shadow-[0_4px_16px_rgba(0,0,0,0.04)] xl:flex">
        <MessageSquare className="mb-4 h-12 w-12 text-[#d6d3d1]" />
        <h3 className="text-lg font-medium text-[#0c0a09]">Chọn yêu cầu</h3>
        <p className="mt-2 text-sm text-[#777169]">
          Nhấn vào một yêu cầu bên trái để xem chi tiết và phản hồi.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[#e7e5e4] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="flex-1 overflow-y-auto">
        {/* Ticket Header */}
        <div className="border-b border-[#e7e5e4] p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#f0efed]">
              {selectedTicket.userAvatarUrl ? (
                <img
                  src={selectedTicket.userAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-[#777169] text-sm font-bold">
                  {selectedTicket.userUsername ? selectedTicket.userUsername.charAt(0).toUpperCase() : <MessageSquare className="h-5 w-5" />}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium text-[#0c0a09]">
                {selectedTicket.userUsername ? `@${selectedTicket.userUsername}` : "Người dùng ẩn danh"}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#777169]">
                <Calendar className="h-3 w-3" />
                {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString("vi-VN") : "Unknown Date"}
              </div>
            </div>
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#0c0a09]">{selectedTicket.title}</h2>
          <div className="mt-2 whitespace-pre-wrap text-sm text-[#4e4e4e]">{selectedTicket.description}</div>
        </div>

        {/* Action Panel */}
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-[#0c0a09]">Lịch sử trao đổi</h3>
          </div>
          
          {selectedTicket.replies && selectedTicket.replies.length > 0 && (
            <div className="mb-6 flex flex-col gap-4">
              {selectedTicket.replies.map((reply) => {
                const isModerator = reply.senderUsername === selectedTicket.handledByUsername || reply.senderUsername !== selectedTicket.userUsername;
                return (
                  <div
                    key={reply.id}
                    className={`rounded-2xl border p-4 ${
                      isModerator
                        ? "border-[#e7e5e4] bg-[#f0efed]/50"
                        : "border-[#e7e5e4] bg-white"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#d6d3d1]">
                        {reply.senderAvatarUrl ? (
                          <img
                            src={reply.senderAvatarUrl}
                            alt={reply.senderUsername}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                            {reply.senderUsername?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-semibold ${isModerator ? "text-[#0c0a09]" : "text-[#777169]"}`}>
                        {isModerator ? `Quản trị viên (@${reply.senderUsername})` : `@${reply.senderUsername}`}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-[#0c0a09]">
                      {reply.content}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[#777169]">
                      <Calendar className="h-3.5 w-3.5" />
                      {reply.createdAt ? new Date(reply.createdAt).toLocaleString("vi-VN") : "Unknown Date"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-2 font-semibold text-[#0c0a09]">
            Phản hồi mới
          </div>

          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Nhập nội dung phản hồi cho người dùng (nếu có)..."
            className="h-32 w-full resize-none rounded-2xl border border-[#d6d3d1] bg-[#f0efed]/50 p-4 text-sm text-[#0c0a09] placeholder:text-[#a8a29e] focus:border-[#292524] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#292524] disabled:opacity-50"
            disabled={saving || selectedTicket.status === "closed"}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            {selectedTicket.status !== "closed" && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus("replied", replyContent);
                }}
                disabled={saving || !replyContent.trim()}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#292524] px-5 text-sm font-medium text-white transition disabled:opacity-50 hover:bg-[#0c0a09]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Gửi phản hồi
              </button>
            )}

            {selectedTicket.status !== "closed" && (
              <button
                type="button"
                onClick={() => onUpdateStatus("closed", replyContent)}
                disabled={saving}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-[#d6d3d1] bg-white px-5 text-sm font-medium text-red-600 transition disabled:opacity-50 hover:bg-red-50"
              >
                Đóng yêu cầu
              </button>
            )}

            {selectedTicket.status === "closed" && (
              <button
                type="button"
                onClick={() => onUpdateStatus("replied", replyContent)}
                disabled={saving}
                className="flex h-10 items-center justify-center gap-2 rounded-full border border-[#d6d3d1] bg-white px-5 text-sm font-medium text-[#292524] transition disabled:opacity-50 hover:bg-[#f0efed]"
              >
                Mở lại yêu cầu
              </button>
            )}
          </div>

          {selectedTicket.handledByUsername && (
            <div className="mt-4 text-xs text-[#777169]">
              Đã xử lý bởi: <span className="font-semibold text-[#0c0a09]">@{selectedTicket.handledByUsername}</span>
              {selectedTicket.handledAt && ` vào ${new Date(selectedTicket.handledAt).toLocaleString("vi-VN")}`}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
