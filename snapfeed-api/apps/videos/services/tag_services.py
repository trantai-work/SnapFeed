from __future__ import annotations

from typing import Iterable

from apps.videos.models import Tag, Video


def _clean_tag_names(raw_names: Iterable[object]) -> list[str]:
    cleaned: list[str] = []
    for raw in raw_names:
        s = str(raw or "").strip()
        if not s:
            continue
        cleaned.append(s[:50])
    # de-dup, keep order
    return list(dict.fromkeys(cleaned))


def sync_video_tags_from_names(
    *, video: Video, names: Iterable[object] | None
) -> list[Tag] | None:
    """
    Normalize a list of tag names and sync to `video.tags`.

    Normalization rules:
    - trim whitespace
    - drop empty names
    - cap each name to 50 chars
    - de-duplicate while preserving order

    Sync rules:
    - create missing Tag rows (by `name`)
    - set the ManyToMany `video.tags` to exactly the normalized list

    Returns:
    - None: caller didn't provide tags input (no changes applied)
    - [] / [Tag, ...]: sync applied (can be empty)
    """
    if names is None:
        return None

    unique = _clean_tag_names(names)
    if not unique:
        video.tags.clear()
        return []

    existing = {t.name: t for t in Tag.objects.filter(name__in=unique)}
    missing = [n for n in unique if n not in existing]
    if missing:
        Tag.objects.bulk_create([Tag(name=n) for n in missing], ignore_conflicts=True)
        existing = {t.name: t for t in Tag.objects.filter(name__in=unique)}

    final_tags = [existing[n] for n in unique if n in existing]
    video.tags.set(final_tags)
    return final_tags
