import re
from django.core.management.base import BaseCommand

from apps.videos.models import Video


class Command(BaseCommand):
    help = "Strip S3 URL prefix from hls_playlist_key, keeping only the S3 key path"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without actually updating the database",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Pattern to match S3 URLs like:
        # https://bucket-name.s3.region.amazonaws.com/path/to/file.m3u8
        # https://bucket-name.s3.amazonaws.com/path/to/file.m3u8
        s3_url_pattern = re.compile(
            r"^https?://[^/]+\.s3(?:\.[^/]+)?\.amazonaws\.com/(.+)$"
        )

        videos = Video.objects.filter(hls_playlist_key__isnull=False).exclude(
            hls_playlist_key=""
        )

        total = videos.count()
        self.stdout.write(f"Found {total} videos with hls_playlist_key")

        if total == 0:
            self.stdout.write(self.style.SUCCESS("No videos to process"))
            return

        updated_count = 0
        skipped_count = 0
        error_count = 0

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "\n=== DRY RUN MODE - No changes will be saved ===\n"
                )
            )

        for video in videos:
            try:
                original_value = video.hls_playlist_key
                match = s3_url_pattern.match(original_value)

                if match:
                    # Extract the S3 key (path after domain)
                    s3_key = match.group(1)

                    if dry_run:
                        self.stdout.write(
                            f"[DRY RUN] Video {video.id}:\n"
                            f"  FROM: {original_value}\n"
                            f"  TO:   {s3_key}\n"
                        )
                    else:
                        video.hls_playlist_key = s3_key
                        video.save(update_fields=["hls_playlist_key", "updated_at"])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Video {video.id}: {original_value} → {s3_key}"
                            )
                        )

                    updated_count += 1
                else:
                    # Already in key format or different format
                    skipped_count += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"⊘ Video {video.id}: Already in key format or unrecognized - {original_value}"
                        )
                    )

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"✗ Video {video.id}: {str(e)}"))

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(f"Total videos: {total}")
        self.stdout.write(f"Updated: {updated_count}")
        self.stdout.write(f"Skipped: {skipped_count}")
        self.stdout.write(f"Errors: {error_count}")

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "\nThis was a DRY RUN. Run without --dry-run to apply changes."
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("\n✓ Migration completed!"))
