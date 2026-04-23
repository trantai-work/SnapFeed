from django.apps import AppConfig


class VideosConfig(AppConfig):
    name = "apps.videos"

    def ready(self) -> None:
        # Register signals (m2m_changed for tags -> reindex)
        from . import signals  # noqa: F401
