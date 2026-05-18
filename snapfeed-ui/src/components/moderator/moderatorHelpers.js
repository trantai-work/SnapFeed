export const statusTabs = [
  { value: "pending", label: "Đang chờ" },
  { value: "dismissed", label: "Đã bỏ qua" },
  { value: "action_taken", label: "Đã xử lý" },
];

export const reasonLabels = {
  spam: "Spam hoặc lừa đảo",
  violence: "Bạo lực hoặc nguy hiểm",
  harassment: "Quấy rối hoặc bắt nạt",
  hate_speech: "Ngôn từ thù ghét",
  nudity: "Nội dung nhạy cảm",
  copyright: "Vi phạm bản quyền",
  misinformation: "Thông tin sai lệch",
  other: "Khác",
};

export function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function reporterName(report) {
  const full = [report?.reporterFirstName, report?.reporterLastName]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" ");
  if (full) return full;
  return report?.reporterUsername ? `@${report.reporterUsername}` : `User ${report?.reporter}`;
}
