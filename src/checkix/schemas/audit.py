"""Audit log schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from checkix.schemas.common import ORMSchema


class AuditLogOut(ORMSchema):
    id: int
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    timestamp: Optional[datetime] = None
