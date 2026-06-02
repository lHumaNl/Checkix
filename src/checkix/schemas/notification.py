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
    event_type_display: str = ""
    channel: Optional[str] = None
    is_active: bool = True
    template_id: Optional[int] = Field(default=None, validation_alias='checklist_template_id')
    checklist_template: Optional[int] = Field(default=None, validation_alias='checklist_template_id')
    checklist_template_name: Optional[str] = None
    checklist_item: Optional[int] = Field(default=None, validation_alias='checklist_item_id')
    checklist_item_title: Optional[str] = None
    sequences: list["NotificationSequenceOut"] = Field(default_factory=list)
    config: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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
    notification_rule: int = Field(validation_alias="notification_rule_id")
    sequence_order: int = 0
    trigger_offset_minutes: int = 0
    recipient_type: str = "assignee"
    recipient_group: Optional[int] = Field(default=None, validation_alias="recipient_group_id")
    recipient_group_name: Optional[str] = None
    custom_email: str = ""
    email_subject: str = ""
    email_body: str = ""
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
    notification_sequence: Optional[int] = Field(default=None, validation_alias="notification_sequence_id")
    checklist_instance: Optional[int] = Field(default=None, validation_alias="checklist_instance_id")
    checklist_instance_name: Optional[str] = None
    recipient_email: str = ""
    user_id: Optional[int] = None
    channel: Optional[str] = None
    status: Optional[str] = None
    status_display: str = ""
    message: Optional[str] = None
    sent_at: Optional[datetime] = None
    error: Optional[str] = Field(default=None, validation_alias='error_message')
    error_message: str = ""
    created_at: Optional[datetime] = None
