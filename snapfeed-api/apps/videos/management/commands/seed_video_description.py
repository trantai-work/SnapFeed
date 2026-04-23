import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from apps.videos.constants import DEFAULT_VIDEO_DESCRIPTIONS
from apps.videos.models import Video


class Command(BaseCommand):
    help = "Seed descriptions for videos without a description."

    def handle(self, *args, **options):
        if not DEFAULT_VIDEO_DESCRIPTIONS:
            self.stdout.write(
                self.style.ERROR("DEFAULT_VIDEO_DESCRIPTIONS is empty in constants.py")
            )
            return

        qs = Video.objects.filter(
            Q(description__isnull=True) | Q(description="")
        ).order_by("id")
        videos = list(qs)
        if not videos:
            self.stdout.write(
                self.style.WARNING("No videos without a description found.")
            )
            return

        for v in videos:
            v.description = random.choice(DEFAULT_VIDEO_DESCRIPTIONS)

        with transaction.atomic():
            Video.objects.bulk_update(videos, ["description"])

        self.stdout.write(
            self.style.SUCCESS(f"Seeded descriptions for {len(videos)} video(s).")
        )
