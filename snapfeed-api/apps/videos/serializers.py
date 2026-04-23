from rest_framework import serializers

from apps.videos.constants import AllowedVideoContentTypes, Reactions
from apps.videos.models import Video, VideoReaction


class VideoSerializer(serializers.ModelSerializer):
    user_avatar = serializers.CharField(source="user.avatar_url", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    title = serializers.CharField(required=False, allow_blank=True, default="")
    my_reaction = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    tags_input = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Video
        fields = [
            "id",
            "user",
            "user_avatar",
            "user_first_name",
            "user_last_name",
            "title",
            "description",
            "tags",
            "tags_input",
            "video_key",
            "thumbnail",
            "duration",
            "view_count",
            "comment_count",
            "reaction_count",
            "my_reaction",
        ]
        read_only_fields = [
            "id",
            "user",
            "view_count",
            "comment_count",
            "reaction_count",
            "my_reaction",
        ]

    def get_my_reaction(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        prefetched = getattr(obj, "_prefetched_user_reactions", None)
        if prefetched is not None:
            return prefetched[0].reaction if prefetched else None

        row = VideoReaction.objects.filter(user=request.user, video_id=obj.pk).first()
        return row.reaction if row else None

    def get_tags(self, obj):
        prefetched_cache = getattr(obj, "_prefetched_objects_cache", None) or {}
        if "tags" not in prefetched_cache:
            return None
        return [t.name for t in prefetched_cache["tags"]]


class PresignedUrlSerializer(serializers.Serializer):
    file_name = serializers.CharField()
    content_type = serializers.ChoiceField(choices=AllowedVideoContentTypes.choices())


class VideoReactionSerializer(serializers.ModelSerializer):
    reaction = serializers.ChoiceField(choices=Reactions.choices())
    reaction_count = serializers.SerializerMethodField()

    class Meta:
        model = VideoReaction
        fields = ["id", "user", "video", "reaction", "reaction_count"]
        read_only_fields = ["id", "user", "video", "reaction_count"]

    def get_reaction_count(self, obj):
        ctx = self.context.get("reaction_count")
        if ctx is not None:
            return ctx
        v = getattr(obj, "video", None)
        if v is not None:
            return v.reaction_count
        return None
