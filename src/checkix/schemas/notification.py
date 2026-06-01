"""Notification rule, sequence, dynamic due-date, and log schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


# ---------------------------------------------------------------------------
# Notification Rule
# ---------------------------------------------------------------------------

class NotificationRuleOut(ORMSchema):
    id: int
    name: Optional[str] = None
    event_type: Optional[str] = None
    channel: Optional[str] = None
    is_active: bool = True
    template_id: Optional[int] = Field(default=None, validation_alias='checklist_template_id')
    config: Optional[dict] = None
    created_at: Optional[datetime] = None


class NotificationRuleCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    event_type: Optional[str] = None
    channel: Optional[str] = None
    is_active: bool = True
    template_id: Optional[int] = None
    config: Optional[dict] = None


# ---------------------------------------------------------------------------
# Dynamic Due Date
# ---------------------------------------------------------------------------

class DynamicDueDateRuleOut(ORMSchema):
    id: int
    name: Optional[str] = None
    rule_type: Optional[str] = None
    offset_days: Optional[int] = None
    reference_field: Optional[str] = None
    config: Optional[dict] = None


# ---------------------------------------------------------------------------
# Notification Sequence
# ---------------------------------------------------------------------------

class NotificationSequenceOut(ORMSchema):
    id: int
    name: Optional[str] = None
    rules: Optional[list[dict]] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


class NotificationSequenceCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    rules: Optional[list[dict]] = None
    is_active: bool = True


# ---------------------------------------------------------------------------
# Notification Log
# ---------------------------------------------------------------------------

class NotificationLogOut(ORMSchema):
    id: int
    rule_id: Optional[int] = Field(default=None, validation_alias='notification_sequence_id')
    user_id: Optional[int] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    sent_at: Optional[datetime] = None
    error: Optional[str] = Field(default=None, validation_alias='error_message')
