import { Loader2, Play, XCircle, EyeOff, Eye } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { formatRelativeTimeVi } from "../../utils/format";
import { getUserDisplayName, getUserAvatarUrl } from "../../utils/feedItem";
import {
  statusTabs,
  reasonLabels,
  classNames,
  reporterName,
} from "./moderatorHelpers";

const handlerName = (report) => {
  if (!report) return "";
  return report.handledByUsername || "Moderator";
};

export default function ReportDetailPanel({
  selectedReport,
  videoLoading,
  selectedVideo,
  setViewerOpen,
  note,
  setNote,
  saving,
  onUpdateStatus,
  onDeleteVideo,
}) {
  const navigate = useNavigate();

  return (
    <section className="min-h-0 overflow-hidden rounded-3xl border border-[#e7e5e4] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      {!selectedReport ? (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-[#777169]">
          Chọn một báo cáo để xem chi tiết.
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="border-b border-[#e7e5e4] p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)]">
              <div className="relative overflow-hidden rounded-3xl border border-[#e7e5e4] bg-[#f0efed]">
                <div className="aspect-[9/16]">
                  {videoLoading ? (
                    <div className="grid h-full place-items-center text-[#777169]">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                  ) : selectedVideo?.thumbnail ? (
                    <img
                      src={selectedVideo.thumbnail}
                      alt={selectedReport.videoTitle || "Video report"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="grid h-full place-items-center px-4 text-center text-sm text-[#777169]">
                      Không có thumbnail.
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <button
                    type="button"
                    disabled={!selectedVideo || videoLoading}
                    onClick={() => setViewerOpen(true)}
                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 text-[15px] font-medium text-[#0c0a09] transition hover:bg-[#f0efed] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Xem video
                  </button>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169]">
                      Báo cáo #{selectedReport.id}
                    </div>
                    {selectedVideo?.title || selectedReport.videoTitle ? (
                      <h2 className="mt-1 text-2xl font-medium text-[#0c0a09]">
                        {selectedVideo?.title || selectedReport.videoTitle}
                      </h2>
                    ) : null}
                  </div>
                  <span
                    className={classNames(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      selectedReport.status === "pending"
                        ? "bg-[#f0efed] text-[#292524]"
                        : selectedReport.status === "dismissed"
                          ? "bg-[#f0efed] text-[#4e4e4e]"
                          : "bg-[#dcfce7] text-[#166534]"
                    )}
                  >
                    {statusTabs.find((x) => x.value === selectedReport.status)?.label ||
                      selectedReport.status}
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-[#f0efed] bg-[#fafafa] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169]">
                      Lý do
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#0c0a09]">
                      {reasonLabels[selectedReport.reason] || selectedReport.reason}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#f0efed] bg-[#fafafa] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169]">
                      Mô tả từ người báo cáo
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4e4e4e]">
                      {selectedReport.description || "Không có mô tả thêm."}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-[#4e4e4e] sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#f0efed] bg-[#fafafa] p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.96px] text-[#777169]">
                        Người báo cáo
                      </div>
                      <div className="flex items-center gap-2.5">
                        {selectedReport?.reporterAvatarUrl ? (
                          <img 
                            src={selectedReport.reporterAvatarUrl} 
                            alt="" 
                            className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-zinc-200 ring-1 ring-black/5" />
                        )}
                        {selectedReport?.reporter ? (
                          <Link
                            to={`/profile/${selectedReport.reporter}`}
                            className="font-bold text-pink-600 hover:text-pink-500 hover:underline"
                          >
                            {reporterName(selectedReport)}
                          </Link>
                        ) : (
                          <span className="font-bold text-pink-600">{reporterName(selectedReport)}</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#f0efed] bg-[#fafafa] p-4 flex flex-col justify-center">
                      <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169] mb-1">
                        Thời gian báo cáo
                      </div>
                      <div className="font-bold text-[#0c0a09]">
                        {formatRelativeTimeVi(selectedReport.createdAt)}
                      </div>
                    </div>
                    {selectedVideo && (
                      <>
                        <div className="rounded-2xl border border-[#f0efed] bg-[#fafafa] p-4">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.96px] text-[#777169]">
                            Người đăng video
                          </div>
                          <div className="flex items-center gap-2.5">
                            {getUserAvatarUrl(selectedVideo) ? (
                              <img 
                                src={getUserAvatarUrl(selectedVideo)} 
                                alt="" 
                                className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5" 
                                referrerPolicy="no-referrer" 
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-zinc-200 ring-1 ring-black/5" />
                            )}
                            {selectedVideo?.user ? (
                              <Link
                                to={`/profile/${selectedVideo.user}`}
                                className="font-bold text-pink-600 hover:text-pink-500 hover:underline"
                              >
                                {getUserDisplayName(selectedVideo)}
                              </Link>
                            ) : (
                              <span className="font-bold text-pink-600">{getUserDisplayName(selectedVideo)}</span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[#f0efed] bg-[#fafafa] p-4 flex flex-col justify-center">
                          <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169] mb-1">
                            Ngày đăng video
                          </div>
                          <div className="font-bold text-[#0c0a09]">
                            {formatRelativeTimeVi(selectedVideo.createdAt)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5">
            <label>
              <span className="mb-1.5 block text-sm font-medium text-[#292524]">
                Ghi chú kiểm duyệt
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={saving}
                rows={4}
                className="w-full resize-none rounded-lg border border-[#d6d3d1] bg-white px-4 py-3 text-sm text-[#0c0a09] outline-none transition placeholder:text-[#a8a29e] focus:border-[#0c0a09] focus:ring-1 focus:ring-[#0c0a09] disabled:bg-[#f0efed] disabled:text-[#777169] disabled:cursor-not-allowed"
                placeholder="Ghi lại lý do xử lý..."
              />
            </label>

            {selectedReport.status !== "pending" && selectedReport.handledBy && (
              <div className="rounded-xl border border-[#e7e5e4] bg-[#fafafa] p-4">
                 <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169] mb-3">
                   Người xử lý
                 </div>
                 <div className="flex items-center gap-3">
                    {selectedReport.handledByAvatarUrl ? (
                       <img src={selectedReport.handledByAvatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5" referrerPolicy="no-referrer" />
                    ) : (
                       <div className="h-9 w-9 rounded-full bg-zinc-200 ring-1 ring-black/5 flex items-center justify-center">
                          <span className="text-sm font-bold text-zinc-500">{handlerName(selectedReport).charAt(0).toUpperCase()}</span>
                       </div>
                    )}
                    <div>
                      <div className="font-bold text-[#0c0a09] text-[15px]">{handlerName(selectedReport)}</div>
                      <div className="text-xs text-[#777169] mt-0.5">Lúc: {formatRelativeTimeVi(selectedReport.handledAt)}</div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#e7e5e4] p-4 bg-white">
            {selectedReport.status !== "dismissed" && selectedReport.status !== "action_taken" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onUpdateStatus("dismissed")}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[#d6d3d1] bg-white px-4 text-[15px] font-medium text-[#292524] transition hover:bg-[#f0efed] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Bỏ qua
              </button>
            )}

            {selectedReport.status === "action_taken" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onUpdateStatus("dismissed")}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-emerald-600 px-5 text-[15px] font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4" />}
                <span>Mở lại video</span>
              </button>
            )}

            {selectedReport.status !== "action_taken" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onUpdateStatus("action_taken")}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-red-600 px-5 text-[15px] font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <EyeOff className="h-4 w-4" />}
                <span>Ẩn video</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
