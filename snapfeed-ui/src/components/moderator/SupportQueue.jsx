import { useMemo } from "react";
import { MessageSquare, ListFilter, Loader2 } from "lucide-react";
import { formatRelativeTimeVi } from "../../utils/format";
import { classNames } from "./moderatorHelpers";

const supportStatusTabs = [
  { value: "pending", label: "Đang chờ" },
  { value: "replied", label: "Đang xử lý" },
  { value: "closed", label: "Đã đóng" },
];

export default function SupportQueue({
  tickets,
  loading,
  activeStatus,
  setActiveStatus,
  selectedTicket,
  setSelectedId,
}) {

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === activeStatus);
  }, [activeStatus, tickets]);

  return (
    <section className="flex min-h-0 flex-col gap-5">
      {/* Queue Card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#e7e5e4] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="border-b border-[#e7e5e4] p-4">
          <div className="flex gap-2 overflow-x-auto">
            {supportStatusTabs.map((tab) => {
              const active = activeStatus === tab.value;
              const count = tickets.filter((ticket) => ticket.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveStatus(tab.value);
                    const next = tickets.find((ticket) => ticket.status === tab.value);
                    setSelectedId(next?.id ?? null);
                  }}
                  className={classNames(
                    "h-9 shrink-0 cursor-pointer rounded-full px-4 text-sm font-medium transition",
                    active
                      ? "bg-[#292524] text-white"
                      : "bg-[#f0efed] text-[#4e4e4e] hover:bg-[#e7e5e4]"
                  )}
                >
                  {tab.label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-[#777169]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="grid min-h-72 place-items-center px-4 text-center text-sm text-[#777169]">
              Không có yêu cầu trong mục này.
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const active = selectedTicket?.id === ticket.id;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={classNames(
                    "mb-2 flex w-full cursor-pointer gap-3 rounded-2xl border p-3 text-left transition",
                    active
                      ? "border-[#292524] bg-[#fafafa]"
                      : "border-[#e7e5e4] bg-white hover:bg-[#fafafa]"
                  )}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f0efed] text-[#777169]">
                    {ticket.userAvatarUrl ? (
                      <img
                        src={ticket.userAvatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs font-bold text-[#4e4e4e]">
                        {ticket.userUsername ? ticket.userUsername.charAt(0).toUpperCase() : <MessageSquare className="h-5 w-5" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#0c0a09]">
                      {ticket.title}
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#4e4e4e]">
                      {ticket.userUsername ? `@${ticket.userUsername}` : "Người dùng"}
                    </div>
                    <div className="mt-1 truncate text-xs text-[#777169]">
                      {ticket.createdAt ? formatRelativeTimeVi(ticket.createdAt) : "Unknown"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
