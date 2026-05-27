import re
import urllib.parse
import unicodedata


def truncate_inline(text: str, *, max_len: int) -> str:
    s = re.sub(r"\s+", " ", (text or "").strip())
    if not s:
        return ""
    if len(s) <= max_len:
        return s
    return s[: max(0, max_len - 3)].rstrip() + "..."


def format_content_disposition(filename: str) -> str:
    """
    Format Content-Disposition header value according to RFC 6266.
    Ensures safe ASCII fallback for 'filename' and UTF-8 encoded 'filename*'.
    """
    if not filename:
        return 'attachment; filename="file"'

    # 1. Replace đ/Đ manually as they don't decompose via NFKD
    normalized = filename.replace("đ", "d").replace("Đ", "D")
    normalized = unicodedata.normalize("NFKD", normalized)
    ascii_filename = "".join([c for c in normalized if not unicodedata.combining(c)])

    # Keep only alphanumeric, space, dot, hyphen, underscore
    ascii_filename = "".join([c for c in ascii_filename if c.isalnum() or c in " .-_"])

    # Hard-enforce ASCII by encoding and ignoring any remaining non-ASCII characters
    ascii_filename = ascii_filename.encode("ascii", "ignore").decode("ascii")

    if not ascii_filename.strip():
        ascii_filename = "file"

    # 2. URL-encode the full UTF-8 filename for filename* parameter
    encoded_filename = urllib.parse.quote(filename)

    # 3. Construct RFC 6266 compliant Content-Disposition value
    return f"attachment; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}"
