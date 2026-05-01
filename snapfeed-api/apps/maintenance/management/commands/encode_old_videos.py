import boto3
import json
from django.core.management.base import BaseCommand
from django.conf import settings

from apps.videos.models import Video
from apps.videos.constants import VideoStatus


class Command(BaseCommand):
    help = "Send old videos to SQS queue for HLS encoding"

    def handle(self, *args, **options):
        videos = Video.objects.filter(hls_playlist_key__isnull=True).order_by("id")
        total = videos.count()

        self.stdout.write(f"Found {total} videos without HLS playlist key")

        if total == 0:
            self.stdout.write(self.style.SUCCESS("No videos to process"))
            return

        sqs = boto3.client("sqs", region_name=settings.AWS_DEFAULT_REGION)
        queue_url = settings.SQS_QUEUE_URL

        success_count = 0
        error_count = 0

        for video in videos:
            try:
                message = {
                    "Records": [
                        {
                            "s3": {
                                "bucket": {"name": settings.AWS_STORAGE_BUCKET_NAME},
                                "object": {"key": video.video_key},
                            }
                        }
                    ]
                }

                sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message))

                video.status = VideoStatus.PROCESSING.value
                video.save(update_fields=["status", "updated_at"])

                success_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✓ {video.id} - {video.video_key}")
                )

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"✗ {video.id}: {str(e)}"))

        self.stdout.write(f"\nSuccess: {success_count}, Errors: {error_count}")
