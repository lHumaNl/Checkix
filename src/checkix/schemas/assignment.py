"""Assignment schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


class AssignmentOut(ORMSchema):
    id: int
    template_id: int = Field(validation_alias='checklist_template_id')
    assignee_type: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: int
    assignee_type: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
