import api from "./api";

function normalizeVideoReport(raw) {
  if (!raw || typeof raw !== "object") return raw;
  return {
    id: raw.id,
    video: raw.video,
    videoTitle: raw.videoTitle ?? raw.video_title ?? "",
    videoThumbnail: raw.videoThumbnail ?? raw.video_thumbnail ?? raw.thumbnail ?? "",
    videoUser: raw.videoUser ?? raw.video_user ?? null,
    reporter: raw.reporter,
    reporterUsername: raw.reporterUsername ?? raw.reporter_username ?? "",
    reporterFirstName: raw.reporterFirstName ?? raw.reporter_first_name ?? "",
    reporterLastName: raw.reporterLastName ?? raw.reporter_last_name ?? "",
    reporterAvatarUrl: raw.reporterAvatarUrl ?? raw.reporter_avatar_url ?? "",
    reason: raw.reason,
    description: raw.description ?? "",
    status: raw.status,
    moderatorNote: raw.moderatorNote ?? raw.moderator_note ?? "",
    handledBy: raw.handledBy ?? raw.handled_by ?? null,
    handledByFirstName: raw.handledByFirstName ?? raw.handled_by_first_name ?? "",
    handledByLastName: raw.handledByLastName ?? raw.handled_by_last_name ?? "",
    handledByUsername: raw.handledByUsername ?? raw.handled_by_username ?? "",
    handledByAvatarUrl: raw.handledByAvatarUrl ?? raw.handled_by_avatar_url ?? "",
    handledAt: raw.handledAt ?? raw.handled_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  };
}

export const reportsApi = {
  listVideoReports: async ({ page = 1, pageSize = 50 } = {}) => {
    const data = await api.get("/video-reports", {
      params: { page, page_size: pageSize },
    });
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    return {
      count: data?.count ?? rawResults.length,
      hasNext: Boolean(data?.hasNext ?? data?.has_next),
      numPages: data?.numPages ?? data?.num_pages ?? 1,
      results: rawResults.map(normalizeVideoReport).filter(Boolean),
    };
  },

  updateVideoReport: async (reportId, patch) => {
    const data = await api.patch(`/video-reports/${reportId}`, patch);
    return normalizeVideoReport(data);
  },

  getSystemStats: async (timeRange = "week") => {
    return await api.get(`/system-stats`, {
      params: { time_range: timeRange },
    });
  },
};
