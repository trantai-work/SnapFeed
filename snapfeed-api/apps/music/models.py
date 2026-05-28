from django.core.validators import FileExtensionValidator
from django.db import models
from core.models import BaseModel


class Music(BaseModel):
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255, blank=True, default="")
    audio_file = models.FileField(
        upload_to="music/audio/",
        validators=[FileExtensionValidator(["mp3", "wav", "aac", "m4a", "ogg"])],
    )
    cover_image = models.ImageField(
        upload_to="music/covers/",
        null=True,
        blank=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png"])],
    )
    duration = models.PositiveIntegerField(help_text="Duration in seconds", default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "music"

    def __str__(self):
        return f"{self.title} - {self.artist}" if self.artist else self.title
