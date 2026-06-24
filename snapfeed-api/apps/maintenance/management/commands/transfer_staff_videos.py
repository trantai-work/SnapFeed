import boto3
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from apps.videos.models import Video
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Transfer seeded videos from staff/superuser accounts to regular users on S3 and database."

    def handle(self, *args, **options):
        User = get_user_model()
        s3_client = boto3.client("s3", region_name=settings.AWS_DEFAULT_REGION)
        bucket = settings.AWS_STORAGE_BUCKET_NAME

        # 1. Find staff/superuser accounts
        staff_users = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True))

        # 2. Find videos belonging to them
        videos = list(Video.objects.filter(user__in=staff_users))

        # 3. Find valid regular users
        regular_users = list(
            User.objects.filter(is_staff=False, is_superuser=False).order_by("id")
        )

        if not regular_users:
            self.stdout.write(
                self.style.ERROR("No regular users found to transfer videos to!")
            )
            return

        if not videos:
            self.stdout.write(
                self.style.SUCCESS(
                    "No videos found belonging to staff/superuser accounts."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Found {len(videos)} videos belonging to staff/superusers. Starting transfer to {len(regular_users)} regular users..."
            )
        )

        for idx, video in enumerate(videos):
            new_user = regular_users[idx % len(regular_users)]
            old_user = video.user

            old_video_key = video.video_key
            parts = old_video_key.split("/")
            if (
                len(parts) >= 3
                and parts[0] == "videos"
                and parts[1] == str(old_user.id)
            ):
                parts[1] = str(new_user.id)
                new_video_key = "/".join(parts)
            else:
                new_video_key = f"videos/{new_user.id}/{parts[-1]}"

            self.stdout.write(
                f"[{idx+1}/{len(videos)}] Transferring video {video.id} ('{video.title}') from {old_user.username} (ID: {old_user.id}) to {new_user.username} (ID: {new_user.id})..."
            )

            # Move file in S3
            try:
                s3_client.copy_object(
                    Bucket=bucket,
                    CopySource={"Bucket": bucket, "Key": old_video_key},
                    Key=new_video_key,
                )
                s3_client.delete_object(Bucket=bucket, Key=old_video_key)
                self.stdout.write(
                    self.style.SUCCESS(f"  ✓ S3 file moved successfully.")
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ Failed to move S3 file: {e}"))
                continue

            # Update database
            with transaction.atomic():
                video.user = new_user
                video.video_key = new_video_key
                video.save(update_fields=["user", "video_key"])
                self.stdout.write(self.style.SUCCESS("  ✓ DB record updated."))

        self.stdout.write(self.style.SUCCESS("Transfer completed successfully!"))
