"""Checklist instance, item instance, and completion log schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


# ---------------------------------------------------------------------------
# Item Instance
# ---------------------------------------------------------------------------

class ChecklistItemInstanceOut(ORMSchema):
    id: int
    title: str
    description: Optional[str] = None
    order: int = 0
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    placeholder_value: Optional[str] = None
    is_visible: bool = True
    parent_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Instance
# ---------------------------------------------------------------------------

class ChecklistInstanceOut(ORMSchema):
    id: int
    name: Optional[str] = None
    status: Optional[str] = None
    status_display: Optional[str] = None
    progress_percentage: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    template_id: int
    version_id: Optional[int] = None
    created_at: Optional[datetime] = None
    item_instances: list[ChecklistItemInstanceOut] = []


class ChecklistInstanceCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: int
    version_id: Optional[int] = None
    name: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Completion Log
# ---------------------------------------------------------------------------

class CompletionLogOut(ORMSchema):
    id: int
    action: Optional[str] = None
    user_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    notes: Optional[str] = None
