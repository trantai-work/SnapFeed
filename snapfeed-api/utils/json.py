from __future__ import annotations

import json
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder


def jsonable(obj: Any) -> Any:
    """
    Convert an object into JSON-serializable primitives (e.g. datetime -> ISO string).

    Useful for payloads that must be msgpack-serializable (e.g. channels_redis).
    """

    return json.loads(json.dumps(obj, cls=DjangoJSONEncoder))
