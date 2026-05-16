from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from django.db import transaction
from safedelete.models import HARD_DELETE

from apps.comments.models import VideoComment
from apps.notifications.models import Notification
from apps.recommendation.models import UserEmbedding, VideoEmbedding
from apps.videos.models import Video, VideoReaction, VideoView


class Command(BaseCommand):
    help = (
        "Hard delete all videos and video-related rows. " "Use before reseeding videos."
    )

    def handle(self, *args, **options):
        video_count = Video.objects.count()

        if video_count == 0:
            self.stdout.write(self.style.SUCCESS("No videos found. Nothing to purge."))
            return

        summary = self._build_summary()
        self._print_summary(summary)

        with transaction.atomic():
            deleted = self._delete_database_rows()

        self.stdout.write(self.style.SUCCESS("Video purge completed."))
        for label, count in deleted.items():
            self.stdout.write(f"{label}: {count}")

    def _build_summary(self) -> dict[str, int]:
        video_ct = ContentType.objects.get_for_model(Video)
        comment_ct = ContentType.objects.get_for_model(VideoComment)
        comment_ids = VideoComment.objects.values_list("id", flat=True)

        return {
            "videos": Video.objects.count(),
            "comments": VideoComment.objects.count(),
            "reactions": VideoReaction.objects.count(),
            "views": VideoView.objects.count(),
            "video_embeddings": VideoEmbedding.objects.count(),
            "user_embeddings": UserEmbedding.objects.count(),
            "notifications": Notification.objects.filter(target_content_type=video_ct)
            .union(
                Notification.objects.filter(
                    target_content_type=comment_ct,
                    target_object_id__in=comment_ids,
                )
            )
            .count(),
        }

    def _print_summary(self, summary: dict[str, int]) -> None:
        self.stdout.write(self.style.WARNING("This will hard delete video data:"))
        for label, count in summary.items():
            self.stdout.write(f"- {label}: {count}")

    def _delete_database_rows(self) -> dict[str, int]:
        video_ct = ContentType.objects.get_for_model(Video)
        comment_ct = ContentType.objects.get_for_model(VideoComment)
        comment_ids = list(VideoComment.objects.values_list("id", flat=True))

        deleted: dict[str, int] = {}

        video_notification_ids = Notification.objects.filter(
            target_content_type=video_ct
        ).values_list("id", flat=True)
        comment_notification_ids = Notification.objects.filter(
            target_content_type=comment_ct,
            target_object_id__in=comment_ids,
        ).values_list("id", flat=True)
        notification_ids = list(video_notification_ids) + list(comment_notification_ids)

        deleted["notifications"] = self._hard_delete(
            Notification.objects.filter(id__in=notification_ids)
        )
        deleted["comments"] = self._hard_delete(VideoComment.objects.all())
        deleted["reactions"] = self._hard_delete(VideoReaction.objects.all())
        deleted["views"] = self._hard_delete(VideoView.objects.all())
        deleted["video_embeddings"] = self._hard_delete(VideoEmbedding.objects.all())
        deleted["user_embeddings"] = self._hard_delete(UserEmbedding.objects.all())
        deleted["videos"] = self._hard_delete(Video.objects.all())

        return deleted

    def _hard_delete(self, queryset) -> int:
        count = queryset.count()
        queryset.delete(force_policy=HARD_DELETE)
        return count
