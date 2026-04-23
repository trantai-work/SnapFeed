from __future__ import annotations

from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from apps.videos.models import Video

try:
    from django_elasticsearch_dsl.registries import registry
except Exception:  # pragma: no cover
    registry = None


@receiver(m2m_changed, sender=Video.tags.through)
def video_tags_changed(sender, instance: Video, action: str, **kwargs):
    """
    Keep Elasticsearch index in sync when video.tags changes.
    """
    if registry is None:
        return
    if action in ("post_add", "post_remove", "post_clear"):
        registry.update(instance)
