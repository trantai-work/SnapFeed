from rest_framework import serializers

from apps.recommendation.models import VideoEmbedding


class VideoEmbeddingSerializer(serializers.ModelSerializer):
    video_s3_key = serializers.CharField(max_length=255, write_only=True)
    embedding = serializers.ListField(
        child=serializers.FloatField(), help_text="768-dimensional vector"
    )

    class Meta:
        model = VideoEmbedding
        fields = ["id", "video", "video_s3_key", "embedding"]
        read_only_fields = ["id", "video"]
