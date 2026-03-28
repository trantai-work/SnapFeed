from django.db import models
from pgvector.django import VectorField, HnswIndex

from apps.users.models import User
from apps.videos.models import Video
from core.models import BaseModel


class VideoEmbedding(BaseModel):

    video = models.OneToOneField(
        Video, on_delete=models.CASCADE, related_name="embedding"
    )

    embedding = VectorField(dimensions=768)

    class Meta:
        db_table = "video_embeddings"
        indexes = [
            HnswIndex(
                name="video_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            )
        ]


class UserEmbedding(BaseModel):

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="embedding"
    )
    embedding = VectorField(dimensions=768)

    class Meta:
        db_table = "user_embeddings"
