from __future__ import annotations

from django_elasticsearch_dsl import Document
from django_elasticsearch_dsl.registries import registry

from apps.users.models import User


@registry.register_document
class UserDocument(Document):
    """
    Elasticsearch document for User search.

    Indexed fields:
    - username
    - first_name
    - last_name
    """

    class Index:
        name = "users"
        settings = {
            "number_of_shards": 1,
            "number_of_replicas": 0,
        }

    class Django:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
        ]
