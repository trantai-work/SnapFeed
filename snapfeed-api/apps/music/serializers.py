from rest_framework import serializers
from apps.music.models import Music


class MusicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Music
        fields = [
            "id",
            "title",
            "artist",
            "audio_file",
            "cover_image",
            "duration",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
