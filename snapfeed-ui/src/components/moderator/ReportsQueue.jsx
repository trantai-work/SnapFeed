import { useMemo } from "react";
import { Clock3, ListFilter, Loader2 } from "lucide-react";
import { formatRelativeTimeVi } from "../../utils/format";
import {
  statusTabs,
  reasonLabels,
  classNames,
  reporterName,
} from "./moderatorHelpers";

export default function ReportsQueue({
  reports,
  loading,
  activeStatus,
  setActiveStatus,
  selectedReport,
  setSelectedId,
  videoPreviewMap,
}) {

  const filteredReports = useMemo(() => {
    return reports.filter((report) => report.status === activeStatus);
  }, [activeStatus, reports]);

  return (
    <section className="flex min-h-0 flex-col gap-5">
      {/* Queue Card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#e7e5e4] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <div className="border-b border-[#e7e5e4] p-4">
          <div className="flex gap-2 overflow-x-auto">
            {statusTabs.map((tab) => {
              const active = activeStatus === tab.value;
              const count = reports.filter((report) => report.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveStatus(tab.value);
                    const next = reports.find((report) => report.status === tab.value);
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
          ) : filteredReports.length === 0 ? (
            <div className="grid min-h-72 place-items-center px-4 text-center text-sm text-[#777169]">
              Không có báo cáo trong mục này.
            </div>
          ) : (
            filteredReports.map((report) => {
              const active = selectedReport?.id === report.id;
              const preview = videoPreviewMap[report.video];
              const thumbnail = report.videoThumbnail || preview?.thumbnail || "";
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={classNames(
                    "mb-2 flex w-full cursor-pointer gap-3 rounded-2xl border p-3 text-left transition",
                    active
                      ? "border-[#292524] bg-[#fafafa]"
                      : "border-[#e7e5e4] bg-white hover:bg-[#fafafa]"
                  )}
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f0efed]">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[#777169]">
                        <Clock3 className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#0c0a09]">
                      {preview?.title || report.videoTitle || `Video #${report.video}`}
                    </div>
                    <div className="mt-1 text-xs font-medium text-[#4e4e4e]">
                      {reasonLabels[report.reason] || report.reason}
                    </div>
                    <div className="mt-1 truncate text-xs text-[#777169]">
                      {reporterName(report)} · {formatRelativeTimeVi(report.createdAt)}
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
