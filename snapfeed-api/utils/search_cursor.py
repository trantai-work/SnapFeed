from __future__ import annotations

import base64
import json


def decode_search_after_cursor(token: str) -> list[object]:
    """
    Decode a base64url cursor (no padding) into ES `search_after` values.
    """

    token = (token or "").strip()
    if not token:
        return []

    pad = "=" * (-len(token) % 4)
    raw = base64.urlsafe_b64decode((token + pad).encode("utf-8"))
    values = json.loads(raw.decode("utf-8"))
    if not isinstance(values, list):
        raise ValueError("cursor must decode to a JSON array")
    return values


def encode_search_after_cursor(values: list[object]) -> str:
    """
    Encode ES `search_after` values into a base64url cursor (no padding).
    """

    raw = json.dumps(values, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")
