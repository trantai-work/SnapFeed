from __future__ import annotations

import boto3
from django.conf import settings
from django.core.management.base import BaseCommand
from botocore.config import Config
from apps.videos.models import Video


class Command(BaseCommand):
    """
    Management command to cleanup orphaned videos on S3.
    It compares files under the S3 prefix `videos/` with the `video_key` records in the database.
    Any S3 object that is not registered in the database will be deleted to free up space.
    """

    help = "Cleanup orphaned videos on S3 that are not referenced in the Video metadata database"

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Dry run: list orphaned files and calculate space savings without actually deleting them",
        )

    def handle(self, *args, **options) -> None:
        dry_run = options.get("dry_run")
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        region = settings.AWS_DEFAULT_REGION

        self.stdout.write(
            self.style.WARNING(
                f"Starting S3 cleanup. Bucket: {bucket_name}, Region: {region}"
            )
        )
        if dry_run:
            self.stdout.write(
                self.style.NOTICE("DRY RUN MODE ENABLED. No files will be deleted.")
            )

        # 1. Get all video keys from database
        db_keys = set(
            Video.objects.values_list("video_key", flat=True).filter(
                video_key__isnull=False
            )
        )
        self.stdout.write(f"Found {len(db_keys)} video records in the database.")

        # 2. Initialize S3 client with proper regional endpoint config
        s3_client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=f"https://s3.{region}.amazonaws.com",
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )

        # 3. List all S3 objects under `videos/` prefix
        self.stdout.write("Scanning S3 bucket under 'videos/' prefix...")
        paginator = s3_client.get_paginator("list_objects_v2")
        pages = paginator.paginate(Bucket=bucket_name, Prefix="videos/")

        orphaned_objects = []
        total_s3_count = 0
        total_s3_size_bytes = 0
        orphaned_size_bytes = 0

        for page in pages:
            contents = page.get("Contents", [])
            for obj in contents:
                key = obj["Key"]
                size = obj["Size"]

                # Skip directories or empty placeholder keys
                if key.endswith("/"):
                    continue

                total_s3_count += 1
                total_s3_size_bytes += size

                # If the S3 key does not exist in the database, mark for deletion
                if key not in db_keys:
                    orphaned_objects.append({"Key": key, "Size": size})
                    orphaned_size_bytes += size

        if not orphaned_objects:
            self.stdout.write(
                self.style.SUCCESS("No orphaned S3 video objects found. S3 is in sync!")
            )
            return

        # 4. Display report
        self.stdout.write("\n--- S3 Video Cleanup Report ---")
        self.stdout.write(f"Total S3 video objects: {total_s3_count}")
        self.stdout.write(
            f"Total S3 video storage: {total_s3_size_bytes / (1024 * 1024):.2f} MB"
        )
        self.stdout.write(
            self.style.NOTICE(f"Orphaned objects found: {len(orphaned_objects)}")
        )
        self.stdout.write(
            self.style.NOTICE(
                f"Reclaimable space: {orphaned_size_bytes / (1024 * 1024):.2f} MB"
            )
        )
        self.stdout.write("--------------------------------\n")

        # 5. Process deletion
        if dry_run:
            self.stdout.write("Orphaned files that would be deleted:")
            for item in orphaned_objects:
                self.stdout.write(
                    f" - {item['Key']} ({item['Size'] / (1024 * 1024):.2f} MB)"
                )
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDry run finished. If you want to delete these files, run without --dry-run."
                )
            )
        else:
            self.stdout.write("Deleting orphaned objects from S3...")
            # S3 delete_objects API allows deleting up to 1000 keys per request
            chunk_size = 1000
            success_delete_count = 0

            for i in range(0, len(orphaned_objects), chunk_size):
                chunk = orphaned_objects[i : i + chunk_size]
                delete_keys = [{"Key": item["Key"]} for item in chunk]

                try:
                    response = s3_client.delete_objects(
                        Bucket=bucket_name,
                        Delete={"Objects": delete_keys, "Quiet": True},
                    )
                    # Check for errors in S3 response
                    errors = response.get("Errors", [])
                    if errors:
                        for err in errors:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"Failed to delete {err['Key']}: {err['Message']}"
                                )
                            )
                    success_delete_count += len(chunk) - len(errors)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Batch deletion failed: {e}"))

            self.stdout.write(
                self.style.SUCCESS(
                    f"Cleanup completed. Successfully deleted {success_delete_count} files, reclaimed {orphaned_size_bytes / (1024 * 1024):.2f} MB."
                )
            )
