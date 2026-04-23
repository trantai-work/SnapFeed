from django.core.management.base import BaseCommand
from django.db import transaction
import random

from apps.videos.models import Tag, Video


class Command(BaseCommand):
    help = "Assign 2 random tags to each video that does not have any tags."

    def handle(self, *args, **options):
        tag_ids = list(Tag.objects.values_list("id", flat=True).order_by("id"))
        if len(tag_ids) < 2:
            self.stdout.write(
                self.style.ERROR(
                    "Not enough tags to assign (need at least 2). Please run seed_tags."
                )
            )
            return

        videos = (
            Video.objects.filter(tags__isnull=True)
            .distinct()
            .values_list("id", flat=True)
        )
        if not videos:
            self.stdout.write(self.style.WARNING("No videos without tags found."))
            return

        m2m = Video._meta.get_field("tags")
        through = Video.tags.through
        rel_video_field = m2m.m2m_field_name()
        rel_tag_field = m2m.m2m_reverse_field_name()
        rows = []
        for vid in videos:
            chosen = random.sample(tag_ids, 2)
            for tid in chosen:
                rows.append(
                    through(
                        **{f"{rel_video_field}_id": vid, f"{rel_tag_field}_id": tid}
                    )
                )
        with transaction.atomic():
            through.objects.bulk_create(rows, ignore_conflicts=True)
        self.stdout.write(
            self.style.SUCCESS(f"Assigned random tags to {len(videos)} videos.")
        )
