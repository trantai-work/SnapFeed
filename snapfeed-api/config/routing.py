from django.urls import re_path

from apps.chats.consumers import ChatsInboxConsumer
from apps.notifications.consumers import NotificationsConsumer

websocket_urlpatterns = [
    re_path(r"^ws/chats/?$", ChatsInboxConsumer.as_asgi()),
    re_path(r"^ws/notifications/?$", NotificationsConsumer.as_asgi()),
]
