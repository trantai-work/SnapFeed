export function formatCount(n) {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(1)}K`;
  return String(x);
}

export function formatRelativeTimeVi(input) {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  const ts = d.getTime();
  if (!Number.isFinite(ts)) return "";

  const diffMs = ts - Date.now();
  const absSec = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

  if (absSec < 15) return "bây giờ";
  if (absSec < 60) return rtf.format(Math.round(diffMs / 1000), "second");

  const absMin = Math.round(absSec / 60);
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), "minute");

  const absHr = Math.round(absMin / 60);
  if (absHr < 24) return rtf.format(Math.round(diffMs / 3600000), "hour");

  const absDay = Math.round(absHr / 24);
  if (absDay < 7) return rtf.format(Math.round(diffMs / 86400000), "day");

  const absWeek = Math.round(absDay / 7);
  return rtf.format(Math.round(diffMs / 604800000), "week");
}
