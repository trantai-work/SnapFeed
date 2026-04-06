from django.core.validators import FileExtensionValidator
from django.db import models

from apps.videos.constants import Reactions
from core.models import BaseModel
from apps.users.models import User


class Video(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="videos")
    description = models.TextField(blank=True)
    video_key = models.CharField(max_length=255, unique=True)
    thumbnail = models.ImageField(
        upload_to="thumbnails/",
        null=True,
        blank=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png"])],
    )
    duration = models.PositiveIntegerField(help_text="Video duration in seconds")
    view_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    reaction_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "videos"
        permissions = [
            ("generate_presigned_url", "Can generate presigned URL for video"),
            ("react_video", "Can react video."),
        ]


class VideoReaction(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="video_reactions"
    )

    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name="reactions")

    reaction = models.CharField(choices=Reactions.choices(), max_length=20)

    class Meta:
        db_table = "video_reactions"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "video"], name="unique_user_video_reaction"
            )
        ]


class VideoView(BaseModel):
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name="video_views", null=True
    )

    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="video_views"
    )

    watch_time = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "video_views"
