from apps.videos.exceptions import VideoWithS3KeyNotFound
from apps.videos.models import Video


def get_video_by_s3_key(video_s3_key):
    """
    Get Video by S3 Key.
    """

    try:
        return Video.objects.get(video_key=video_s3_key)
    except Video.DoesNotExist:
        raise VideoWithS3KeyNotFound(s3_key=video_s3_key)
