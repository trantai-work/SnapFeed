from __future__ import annotations

import logging
from typing import Iterable

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class BaseAsyncJsonWebsocketConsumer(AsyncJsonWebsocketConsumer):
    """
    Shared helpers for websocket consumers:
    - Track joined groups for safe cleanup on disconnect
    - Best-effort error message before close
    """

    group_names: set[str]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Per-connection set of groups this socket joined.
        self.group_names = set()

    async def add_groups(self, *group_names: str) -> None:
        # Join one or many channel layer groups and remember them for cleanup.

        for name in group_names:
            if not name:
                continue
            await self.channel_layer.group_add(name, self.channel_name)
            self.group_names.add(name)

    async def discard_groups(self, group_names: Iterable[str] | None = None) -> None:
        # Best-effort leave groups (all joined groups by default).

        names = list(group_names) if group_names is not None else list(self.group_names)
        for name in names:
            try:
                await self.channel_layer.group_discard(name, self.channel_name)
            except Exception:
                # Best-effort cleanup; avoid raising in disconnect.
                pass
            self.group_names.discard(name)

    async def disconnect(self, close_code):
        # Automatically leave all groups when the socket disconnects.

        await self.discard_groups()

    async def _close_with_error(self, *, code: int, message: str) -> None:
        """
        Close the connection with an application-level error code.
        """

        # If the socket is already accepted, we can optionally send an error payload.
        accepted = bool(getattr(self, "accepted", False))
        if accepted:
            try:
                await self.send_json(
                    {"type": "error", "payload": {"code": code, "message": message}}
                )
            except Exception:
                logger.exception(
                    "Failed to send websocket error payload before close",
                    extra={"close_code": code},
                )

        await self.close(code=code)
