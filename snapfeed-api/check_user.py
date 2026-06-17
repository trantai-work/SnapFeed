import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import User
from apps.recommendation.services.preference_services import (
    get_user_preferences_statistics,
)

try:
    user = User.objects.get(username="user_83587bc90084")
    print(f"User found: ID={user.id}, Username={user.username}")
    print(f"Has hasattr(user, 'embedding')?: {hasattr(user, 'embedding')}")
    if hasattr(user, "embedding"):
        print(f"Embedding object ID: {user.embedding.id}")
        print(
            f"Embedding vector (first 5 elements): {user.embedding.embedding[:5] if user.embedding.embedding is not None else None}"
        )
        print(f"Accumulated weight: {user.embedding.accumulated_weight}")

    stats = get_user_preferences_statistics(user.id)
    print("\nget_user_preferences_statistics output:")
    import pprint

    pprint.pprint(stats)

except Exception:
    import traceback

    traceback.print_exc()
