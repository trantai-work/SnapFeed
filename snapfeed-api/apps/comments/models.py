from django.db import models

from apps.users.models import User
from apps.videos.models import Video
from core.models import BaseModel


class VideoComment(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="video_comments"
    )

    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="comments")

    content = models.TextField()

    class Meta:
        db_table = "video_comments"
