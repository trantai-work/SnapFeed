from __future__ import annotations

import json
from pathlib import Path

import boto3
import requests
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import User
from apps.videos.constants import AllowedVideoContentTypes, MAX_VIDEO_UPLOAD_SIZE
from apps.videos.models import Video
from utils import random


class Command(BaseCommand):
    """
    Management command to seed videos from a local folder structure to S3 + DB.
    """

    help = "Seed videos for users: videos/ + thumbnails/ + durations.json -> S3 (presigned POST) -> Video metadata"

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--path",
            type=str,
            required=True,
            help="Path to seed folder. Folder must contain: videos/ , thumbnails/ , durations.json",
        )

    def handle(self, *args, **options):
        seed_root_path = Path(options.get("path"))

        videos_dir = seed_root_path / "videos"
        thumbnails_dir = seed_root_path / "thumbnails"
        durations_path = seed_root_path / "durations.json"

        if not videos_dir.exists() or not videos_dir.is_dir():
            self.stdout.write(self.style.ERROR(f"Missing folder: {videos_dir}"))
            return

        if not thumbnails_dir.exists() or not thumbnails_dir.is_dir():
            self.stdout.write(self.style.ERROR(f"Missing folder: {thumbnails_dir}"))
            return

        if not durations_path.exists() or not durations_path.is_file():
            self.stdout.write(self.style.ERROR(f"Missing file: {durations_path}"))
            return

        try:
            durations_map_raw = durations_path.read_text(encoding="utf-8")
            durations_map = json.loads(durations_map_raw)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Failed to read durations.json: {exc}"))
            return

        if not isinstance(durations_map, dict):
            self.stdout.write(
                self.style.ERROR(
                    "durations.json must be a JSON object (key -> duration)."
                )
            )
            return

        video_paths = sorted(videos_dir.glob("*.mp4"))

        if not video_paths:
            self.stdout.write(
                self.style.ERROR(f"No .mp4 files found under: {videos_dir}")
            )
            return

        users = list(User.objects.filter(is_superuser=False).order_by("id"))
        if not users:
            self.stdout.write(
                self.style.ERROR(
                    "No non-superuser accounts found. Can't round-robin seed."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Found {len(video_paths)} videos, {len(users)} users. Starting round-robin seed..."
            )
        )

        s3_client = boto3.client("s3")

        success_count = 0
        failed_count = 0

        for idx, video_path in enumerate(video_paths):
            user = users[idx % len(users)]
            file_name = video_path.name
            content_type = AllowedVideoContentTypes.mp4.value

            try:
                file_size = video_path.stat().st_size
                if file_size <= 0 or file_size > MAX_VIDEO_UPLOAD_SIZE:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skip oversized/invalid file ({file_size} bytes): {video_path}"
                        )
                    )
                    continue

                uuid_file_name = random.add_uuid_to_filename(file_name)
                s3_key = f"videos/{user.id}/{uuid_file_name}"

                self.stdout.write(
                    f"[{idx+1}/{len(video_paths)}] Uploading {file_name} -> S3 key {s3_key} (user_id={user.id})"
                )

                presigned_post = s3_client.generate_presigned_post(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=s3_key,
                    Fields={"Content-Type": content_type},
                    Conditions=[
                        {"Content-Type": content_type},
                        ["content-length-range", 1, MAX_VIDEO_UPLOAD_SIZE],
                    ],
                    ExpiresIn=3600,
                )

                # Upload local file to S3 using the presigned POST.
                with open(video_path, "rb") as f:
                    files = {"file": (file_name, f, content_type)}
                    resp = requests.post(
                        presigned_post["url"],
                        data=presigned_post["fields"],
                        files=files,
                        timeout=600,
                    )

                # S3 presigned POST returns 204 on success.
                if resp.status_code not in (200, 201, 204):
                    raise RuntimeError(
                        f"S3 upload failed: status_code={resp.status_code}, body={resp.text[:500]}"
                    )

                # Save metadata into DB: thumbnail from thumbnails/ + duration from durations.json.
                if file_name not in durations_map:
                    raise RuntimeError(
                        f"Missing duration for video file in durations.json: {file_name}"
                    )

                duration_seconds = int(durations_map[file_name])

                thumb_filename = f"{video_path.stem}.jpg"
                thumb_local_path = thumbnails_dir / thumb_filename
                if not thumb_local_path.exists():
                    raise RuntimeError(f"Missing thumbnail file: {thumb_local_path}")

                with open(thumb_local_path, "rb") as thumb_f:
                    thumbnail_file = File(thumb_f, name=thumb_filename)

                    with transaction.atomic():
                        video = Video(
                            user=user,
                            description="",
                            video_key=s3_key,
                            duration=duration_seconds,
                        )
                        # ImageField writes to storage on save.
                        video.thumbnail.save(thumb_filename, thumbnail_file, save=True)

                success_count += 1
            except Exception as exc:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(f"Seed failed for {video_path}: {exc}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completed. success={success_count}, failed={failed_count}"
            )
        )
