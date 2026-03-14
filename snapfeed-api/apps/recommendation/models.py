from django.db import models
from pgvector.django import VectorField

from apps.videos.models import Video
from core.models import BaseModel


class VideoEmbedding(BaseModel):

    video = models.OneToOneField(
        Video, on_delete=models.CASCADE, related_name="embedding"
    )

    embedding = VectorField(dimensions=768)

    class Meta:
        db_table = "video_embeddings"
