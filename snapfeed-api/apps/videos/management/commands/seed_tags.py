from django.core.management.base import BaseCommand
from apps.videos.constants import DEFAULT_TAGS
from apps.videos.models import Tag


class Command(BaseCommand):
    """
    Management command to seed tags.
    """

    help = "Seed tags from DEFAULT_TAGS if not exist."

    def handle(self, *args, **options):

        tags = [tag.strip()[:50] for tag in DEFAULT_TAGS if tag and tag.strip()]
        tags = list(dict.fromkeys(tags))
        before = Tag.objects.count()
        Tag.objects.bulk_create([Tag(name=tag) for tag in tags], ignore_conflicts=True)
        after = Tag.objects.count()
        created = max(0, after - before)

        self.stdout.write(
            self.style.SUCCESS(f"Seed tags done, created {created} tag(s)!")
        )
