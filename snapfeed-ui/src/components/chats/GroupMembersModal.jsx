import React from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fullName } from "../../utils/chat";

export default function GroupMembersModal({ open, onClose, conversation, meId }) {
  const navigate = useNavigate();
  if (!open) return null;

  const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];

  const handleMemberClick = (userId) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-[480px] max-h-[70vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-150 p-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Thành viên nhóm</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {participants.length} thành viên
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100 cursor-pointer transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-white/5">
          {participants.map((member) => {
            const isMe = Number(member.id) === Number(meId);
            const nameStr = fullName(member);
            const avatarUrl = member.avatarUrl;

            return (
              <div
                key={member.id}
                onClick={() => handleMemberClick(member.id)}
                className="flex cursor-pointer items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors rounded-xl"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover border border-zinc-100 dark:border-white/5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-gray-300 dark:bg-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-sm">
                      {(nameStr || member.username)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 flex flex-col">
                    <span className="truncate text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      {nameStr}
                      {isMe && (
                        <span className="rounded bg-pink-100 dark:bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-600 dark:text-pink-400">
                          Bạn
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      @{member.username}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
