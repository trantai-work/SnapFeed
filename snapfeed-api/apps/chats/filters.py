import django_filters

from apps.chats.models import Message


class MessageFilter(django_filters.FilterSet):
    conversation_id = django_filters.NumberFilter(
        field_name="conversation_id", required=True
    )

    class Meta:
        model = Message
        fields = ["conversation_id"]
