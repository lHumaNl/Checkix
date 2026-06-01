"""WebSocket connection manager for group-based message broadcasting."""

from collections import defaultdict
from logging import getLogger
from typing import Any

from fastapi import WebSocket

logger = getLogger(__name__)


class ConnectionManager:
    """Maintains active WebSocket connections grouped by an arbitrary key.

    Typical usage::

        await connection_manager.connect(ws, group="checklist:42")
        await connection_manager.broadcast("checklist:42", {"event": "updated"})
        await connection_manager.disconnect(ws, group="checklist:42")
    """

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, group: str) -> None:
        """Accept the handshake and register *websocket* under *group*."""
        await websocket.accept()
        self.active_connections[group].append(websocket)
        logger.debug("WebSocket connected to group %s", group)

    async def disconnect(self, websocket: WebSocket, group: str) -> None:
        """Remove *websocket* from *group* and clean up empty groups."""
        connections = self.active_connections.get(group)
        if connections is None:
            return

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            del self.active_connections[group]

        logger.debug("WebSocket disconnected from group %s", group)

    async def broadcast(self, group: str, message: dict[str, Any]) -> None:
        """Send *message* as JSON to every connection in *group*.

        Connections that fail to receive are silently removed.
        """
        connections = self.active_connections.get(group, [])
        stale: list[WebSocket] = []

        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                logger.warning(
                    "Failed to send to websocket in group %s; removing",
                    group,
                    exc_info=True,
                )
                stale.append(websocket)

        for ws in stale:
            connections.remove(ws)

        if not connections:
            self.active_connections.pop(group, None)


# Module-level singleton for convenience.
connection_manager = ConnectionManager()
