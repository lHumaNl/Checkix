"""Calendar event schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema

CalendarEventType = Literal["checklist", "todo", "custom"]


class CalendarEventOut(ORMSchema):
    id: int
    title: str
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: bool = False
    event_type: CalendarEventType = "custom"
    reminder_minutes_before: Optional[int] = None
    checklist_template: Optional[int] = None
    location: Optional[str] = None
    color: Optional[str] = None
    recurrence_rule: Optional[str] = None
    created_at: Optional[datetime] = None


class CalendarEventCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: bool = False
    event_type: CalendarEventType = "custom"
    reminder_minutes_before: Optional[int] = None
    checklist_template: Optional[int] = None
    location: Optional[str] = None
    color: Optional[str] = None
    recurrence_rule: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    event_type: Optional[CalendarEventType] = None
    reminder_minutes_before: Optional[int] = None
    checklist_template: Optional[int] = None
    location: Optional[str] = None
    color: Optional[str] = None
    recurrence_rule: Optional[str] = None
