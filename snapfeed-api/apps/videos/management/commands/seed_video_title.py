import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from apps.videos.constants import DEFAULT_VIDEO_TITLES
from apps.videos.models import Video


class Command(BaseCommand):
    help = "Seed title for videos that are missing title."

    def handle(self, *args, **options):
        if not DEFAULT_VIDEO_TITLES:
            self.stdout.write(
                self.style.ERROR("DEFAULT_VIDEO_TITLES is empty in constants.py")
            )
            return

        qs = Video.objects.filter(Q(title__isnull=True) | Q(title="")).order_by("id")
        videos = list(qs)
        if not videos:
            self.stdout.write(self.style.WARNING("No videos found without title."))
            return

        for v in videos:
            v.title = random.choice(DEFAULT_VIDEO_TITLES)[:255]

        with transaction.atomic():
            Video.objects.bulk_update(videos, ["title"])

        self.stdout.write(
            self.style.SUCCESS(f"Seeded titles for {len(videos)} videos.")
        )
