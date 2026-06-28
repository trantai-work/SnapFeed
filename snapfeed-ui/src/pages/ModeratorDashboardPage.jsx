import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { authApi, reportsApi, supportApi } from "../api";
import { videosApi } from "../api/video.api";
import { useAuth } from "../context/AuthContext";
import { useMessageBox } from "../components/MessageBox";
import { useRealtimeSocket } from "../context/RealtimeSocketContext";
import logoLightMode from "../assets/logo_light_mode.png";

// Import Moderator components
import ModeratorSidebar from "../components/moderator/ModeratorSidebar";
import ReportsQueue from "../components/moderator/ReportsQueue";
import ReportDetailPanel from "../components/moderator/ReportDetailPanel";
import ModeratorVideoReviewModal from "../components/moderator/ModeratorVideoReviewModal";
import ModeratorDashboardCharts from "../components/moderator/ModeratorDashboardCharts";
import SupportQueue from "../components/moderator/SupportQueue";
import SupportDetailPanel from "../components/moderator/SupportDetailPanel";
import MusicManagement from "../components/moderator/MusicManagement";
import UserPreferences from "../components/moderator/UserPreferences";
import UsersManagement from "../components/moderator/UsersManagement";
import { classNames } from "../components/moderator/moderatorHelpers";

function canModerate(user) {
  return Boolean(user?.isModerator || user?.isAdmin || user?.is_moderator || user?.is_admin);
}

export default function ModeratorDashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setUser } = useAuth();
  const { show } = useMessageBox();
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'reports' | 'support'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("pending");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreviewMap, setVideoPreviewMap] = useState({});
  const [videoLoading, setVideoLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Support
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeSupportStatus, setActiveSupportStatus] = useState("pending");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const allowed = canModerate(user);
  const { subscribe } = useRealtimeSocket();

  const ticketsRef = useRef(tickets);
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    if (!allowed || authLoading) return;

    const unsubCreated = subscribe("support.ticket_created", (payload) => {
      const { ticket } = payload || {};
      if (!ticket) return;

      show({
        status: "info",
        title: "Yêu cầu hỗ trợ mới",
        message: `@${ticket.userUsername || 'Người dùng'} đã gửi yêu cầu: "${ticket.title}"`,
      });

      setTickets((prev) => {
        const exists = prev.some((t) => t.id === ticket.id);
        if (exists) return prev;
        return [ticket, ...prev];
      });
    });

    const unsubReply = subscribe("support.reply_created", (payload) => {
      const { reply, ticketId } = payload || {};
      if (!reply || !ticketId) return;

      if (reply.senderUsername !== user?.username) {
        const ticket = ticketsRef.current.find((t) => t.id === ticketId);
        show({
          status: "info",
          title: "Phản hồi mới từ người dùng",
          message: `@${reply.senderUsername} đã phản hồi yêu cầu "${ticket?.title || 'hỗ trợ'}"`,
        });
      }

      setTickets((prev) => {
        return prev.map((t) => {
          if (t.id !== ticketId) return t;

          const replies = t.replies || [];
          const exists = replies.some((r) => r.id === reply.id);
          const newReplies = exists ? replies : [...replies, reply];

          return {
            ...t,
            replies: newReplies,
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
        if (!exists) {
          return [ticket, ...prev];
        }
        return prev.map((t) => {
          if (t.id !== ticket.id) return t;
          return {
            ...t,
            ...ticket,
            replies: ticket.replies !== undefined ? ticket.replies : t.replies,
          };
        });
      });
    });

    const unsubReportCreated = subscribe("video_report.created", (payload) => {
      const { report } = payload || {};
      if (!report) return;

      show({
        status: "warning",
        title: "Báo cáo video mới",
        message: `Video (ID: ${report.video}) vừa bị báo cáo: "${report.reason}"`,
      });

      setReports((prev) => {
        const exists = prev.some((r) => r.id === report.id);
        if (exists) return prev;
        return [report, ...prev];
      });
    });

    const unsubReportUpdated = subscribe("video_report.updated", (payload) => {
      const { report } = payload || {};
      if (!report) return;

      setReports((prev) => {
        const exists = prev.some((r) => r.id === report.id);
        if (!exists) return [report, ...prev];
        return prev.map((r) => (r.id === report.id ? { ...r, ...report } : r));
      });
    });

    return () => {
      unsubCreated?.();
      unsubReply?.();
      unsubUpdated?.();
      unsubReportCreated?.();
      unsubReportUpdated?.();
    };
  }, [allowed, authLoading, subscribe, user?.username, show]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const page = await reportsApi.listVideoReports({ pageSize: 100 });
      const nextReports = page.results || [];
      setReports(nextReports);
      setSelectedId((current) => current ?? nextReports?.[0]?.id ?? null);
    } catch (err) {
      show({
        status: "error",
        title: "Không tải được báo cáo",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  }, [show]);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const page = await supportApi.listModeratorTickets({ pageSize: 100 });
      const nextTickets = page.results || [];
      setTickets(nextTickets);
      setSelectedTicketId((current) => current ?? nextTickets?.[0]?.id ?? null);
    } catch (err) {
      show({
        status: "error",
        title: "Không tải được yêu cầu hỗ trợ",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setTicketsLoading(false);
    }
  }, [show]);

  useEffect(() => {
    if (!authLoading && allowed) {
      loadReports();
      loadTickets();
    }
  }, [allowed, authLoading, loadReports, loadTickets]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => report.status === activeStatus);
  }, [activeStatus, reports]);

  const selectedReport = useMemo(() => {
    return reports.find((report) => report.id === selectedId) || filteredReports[0] || null;
  }, [filteredReports, reports, selectedId]);

  useEffect(() => {
    if (!selectedReport && filteredReports[0]) {
      setSelectedId(filteredReports[0].id);
    }
  }, [filteredReports, selectedReport]);

  useEffect(() => {
    setNote(selectedReport?.moderatorNote || "");
  }, [selectedReport?.id, selectedReport?.moderatorNote]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === activeSupportStatus);
  }, [activeSupportStatus, tickets]);

  const selectedTicket = useMemo(() => {
    return tickets.find((ticket) => ticket.id === selectedTicketId) || filteredTickets[0] || null;
  }, [filteredTickets, tickets, selectedTicketId]);

  useEffect(() => {
    if (!selectedTicket && filteredTickets[0]) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedTicket]);

  useEffect(() => {
    setReplyContent("");
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!selectedReport?.video) {
      setSelectedVideo(null);
      setViewerOpen(false);
      return;
    }

    let alive = true;
    setVideoLoading(true);
    setViewerOpen(false);
    videosApi
      .getModeratorVideoById(selectedReport.video)
      .then((video) => {
        if (alive) setSelectedVideo(video);
      })
      .catch(() => {
        if (alive) setSelectedVideo(null);
      })
      .finally(() => {
        if (alive) setVideoLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedReport?.video]);

  useEffect(() => {
    const missing = filteredReports
      .filter((report) => report?.video && !report?.videoThumbnail && !(report.video in videoPreviewMap))
      .slice(0, 24);

    if (!missing.length) return;

    let alive = true;
    Promise.allSettled(
      missing.map((report) =>
        videosApi.getModeratorVideoById(report.video)
          .then((video) => [report.video, video])
          .catch(() => [report.video, null])
      )
    ).then((results) => {
      if (!alive) return;
      setVideoPreviewMap((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const [videoId, video] = result.value;
            next[videoId] = video || null;
          }
        });
        return next;
      });
    });

    return () => {
      alive = false;
    };
  }, [filteredReports, videoPreviewMap]);

  if (authLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f5f5f5] text-[#777169]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/moderator/login" replace />;
  }

  const updateReportStatus = async (status, moderatorNote = note, extra = {}) => {
    if (!selectedReport || saving) return;
    setSaving(true);
    try {
      const updated = await reportsApi.updateVideoReport(selectedReport.id, {
        status,
        moderatorNote,
        ...extra,
      });
      setReports((prev) =>
        prev.map((report) => (report.id === updated.id ? updated : report))
      );
      show({
        status: "success",
        title: "Đã cập nhật báo cáo",
        message:
          status === "dismissed"
            ? "Báo cáo đã được bỏ qua."
            : status === "pending"
            ? "Báo cáo đã được chuyển về danh sách chờ duyệt."
            : "Báo cáo đã được đánh dấu xử lý.",
      });
      setActiveStatus(status);
      setSelectedId(updated.id);
    } catch (err) {
      show({
        status: "error",
        title: "Không cập nhật được",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTicketStatus = async (status, reply = replyContent) => {
    if (!selectedTicket || saving) return;
    setSaving(true);
    try {
      const updated = await supportApi.updateTicket(selectedTicket.id, {
        status,
        reply_content: reply,
      });
      setTickets((prev) =>
        prev.map((ticket) => (ticket.id === updated.id ? updated : ticket))
      );
      show({
        status: "success",
        title: "Đã cập nhật yêu cầu",
        message: "Thay đổi của bạn đã được lưu lại.",
      });
      setActiveSupportStatus(status);
      setSelectedTicketId(updated.id);
      setReplyContent("");
    } catch (err) {
      show({
        status: "error",
        title: "Không cập nhật được",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteReportedVideo = async () => {
    if (!selectedReport?.video || saving) return;
    const ok = window.confirm("Xóa video này vĩnh viễn?");
    if (!ok) return;

    setSaving(true);
    try {
      await videosApi.deleteVideo(selectedReport.video);
      const updated = await reportsApi.updateVideoReport(selectedReport.id, {
        status: "action_taken",
        moderatorNote: note.trim() || "Video deleted by moderator.",
      });
      setReports((prev) =>
        prev.map((report) => (report.id === updated.id ? updated : report))
      );
      setSelectedVideo(null);
      setViewerOpen(false);
      setActiveStatus("action_taken");
      setSelectedId(updated.id);
      show({
        status: "success",
        title: "Đã xóa video",
        message: "Báo cáo đã được đánh dấu là đã xử lý.",
      });
    } catch (err) {
      show({
        status: "error",
        title: "Không xóa được video",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
    navigate("/moderator/login", { replace: true });
  };

  const pendingCount = reports.filter((report) => report.status === "pending").length;

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f5f5f5] font-['Inter',system-ui,sans-serif] text-[#0c0a09]">
      <div className="flex h-full min-h-0">
        <ModeratorSidebar
          user={user}
          reportsCount={reports.length}
          supportCount={tickets.filter(t => t.status === "pending").length}
          onLogout={logout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="hidden">
            <div className="flex min-h-20 flex-col justify-between gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
              <div className="flex items-center gap-3">
                <img
                  src={logoLightMode}
                  alt="SnapFeed"
                  className="h-12 w-auto cursor-pointer object-contain lg:hidden"
                  onClick={() => {
                    if (window.location.pathname === "/") {
                      window.location.reload();
                    } else {
                      navigate("/");
                    }
                  }}
                />
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#292524] text-white">
                  <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.96px] text-[#777169]">
                    Content safety
                  </div>
                  <h1 className="font-['Times_New_Roman',serif] text-3xl font-light leading-tight tracking-[-0.32px]">
                    Kiểm duyệt nội dung
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden rounded-full bg-[#f0efed] px-4 py-2 text-sm font-medium text-[#292524] sm:block">
                  {pendingCount} báo cáo đang chờ
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "support") loadTickets();
                    else loadReports();
                  }}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[#d6d3d1] bg-transparent px-4 text-[15px] font-medium text-[#0c0a09] transition hover:bg-[#f0efed]"
                >
                  <RefreshCw className={classNames("h-4 w-4", (loading || ticketsLoading) ? "animate-spin" : "")} />
                  Làm mới
                </button>
              </div>
            </div>
          </header>

          {activeTab === "dashboard" ? (
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <ModeratorDashboardCharts />
            </main>
          ) : activeTab === "support" ? (
            <main className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 sm:px-6 xl:grid-cols-[minmax(30rem,40%)_minmax(0,1fr)]">
              <SupportQueue
                tickets={tickets}
                loading={ticketsLoading}
                activeStatus={activeSupportStatus}
                setActiveStatus={setActiveSupportStatus}
                selectedTicket={selectedTicket}
                setSelectedId={setSelectedTicketId}
              />
              <SupportDetailPanel
                selectedTicket={selectedTicket}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                saving={saving}
                onUpdateStatus={updateTicketStatus}
              />
            </main>
          ) : activeTab === "music" ? (
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <MusicManagement />
            </main>
          ) : activeTab === "preferences" ? (
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <UserPreferences />
            </main>
          ) : activeTab === "users" ? (
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <UsersManagement />
            </main>
          ) : (
            <main className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 sm:px-6 xl:grid-cols-[minmax(30rem,40%)_minmax(0,1fr)]">
              <ReportsQueue
                reports={reports}
                loading={loading}
                activeStatus={activeStatus}
                setActiveStatus={setActiveStatus}
                selectedReport={selectedReport}
                setSelectedId={setSelectedId}
                videoPreviewMap={videoPreviewMap}
              />

              <ReportDetailPanel
                selectedReport={selectedReport}
                videoLoading={videoLoading}
                selectedVideo={selectedVideo}
                setViewerOpen={setViewerOpen}
                note={note}
                setNote={setNote}
                saving={saving}
                onUpdateStatus={updateReportStatus}
                onDeleteVideo={deleteReportedVideo}
              />
            </main>
          )}
        </div>
      </div>

      <ModeratorVideoReviewModal
        open={viewerOpen && !!selectedVideo}
        video={selectedVideo}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
