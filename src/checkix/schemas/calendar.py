"""Calendar event schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


class CalendarEventOut(ORMSchema):
    id: int
    title: str
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: bool = False
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
    location: Optional[str] = None
    color: Optional[str] = None
    recurrence_rule: Optional[str] = None
