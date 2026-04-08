import re


def truncate_inline(text: str, *, max_len: int) -> str:
    s = re.sub(r"\s+", " ", (text or "").strip())
    if not s:
        return ""
    if len(s) <= max_len:
        return s
    return s[: max(0, max_len - 3)].rstrip() + "..."
