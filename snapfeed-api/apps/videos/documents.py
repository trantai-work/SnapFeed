from __future__ import annotations

from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry

from apps.videos.models import Video


@registry.register_document
class VideoDocument(Document):
    """
    Elasticsearch document for Video search.

    Indexed fields:
    - title
    - description
    - tags (list of tag names)
    """

    tags = fields.KeywordField(multi=True)

    class Index:
        name = "videos"
        settings = {
            "number_of_shards": 1,
            "number_of_replicas": 0,
        }

    class Django:
        model = Video
        fields = [
            "id",
            "title",
            "description",
        ]

    def prepare_tags(self, instance: Video) -> list[str]:
        return list(instance.tags.values_list("name", flat=True))
