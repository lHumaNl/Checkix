"""LDAP sync log schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from checkix.schemas.common import ORMSchema


class LDAPSyncLogOut(ORMSchema):
    id: int
    status: Optional[str] = None
    users_synced: int = 0
    users_created: int = 0
    users_updated: int = 0
    errors: Optional[list[str]] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
