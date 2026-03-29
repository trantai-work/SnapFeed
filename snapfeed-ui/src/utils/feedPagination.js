export function cursorFromNextUrl(nextUrl) {
  if (!nextUrl) return null;
  try {
    const u = new URL(nextUrl);
    return u.searchParams.get("cursor");
  } catch {
    return null;
  }
}
