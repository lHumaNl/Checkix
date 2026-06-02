"""Webhook and webhook event schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


class WebhookOut(ORMSchema):
    id: int
    url: str = Field(validation_alias='endpoint_url')
    endpoint_url: str
    name: Optional[str] = None
    events: Optional[str] = Field(default=None, validation_alias='event_type')
    event_type: str
    event_type_display: str = ""
    is_active: bool = True
    headers: dict[str, str] = Field(default_factory=dict)
    events_count: int = 0
    recent_events: list["WebhookEventOut"] = Field(default_factory=list)
    last_event_status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WebhookCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    url: str
    name: Optional[str] = None
    events: Optional[list[str]] = None
    is_active: bool = True
    secret: Optional[str] = None


class WebhookUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    url: Optional[str] = None
    name: Optional[str] = None
    events: Optional[list[str]] = None
    is_active: Optional[bool] = None
    secret: Optional[str] = None


class WebhookEventOut(ORMSchema):
    id: int
    webhook_id: int
    webhook: int = Field(validation_alias="webhook_id")
    webhook_name: str = ""
    checklist_instance: Optional[int] = Field(default=None, validation_alias="checklist_instance_id")
    checklist_instance_name: Optional[str] = None
    event_type: Optional[str] = None
    payload: Optional[dict] = None
    status: Optional[str] = None
    status_display: str = ""
    response_code: Optional[int] = None
    retry_count: int = 0
    attempts: int = Field(default=0, validation_alias='retry_count')
    last_attempt_at: Optional[datetime] = Field(default=None, validation_alias='sent_at')
    sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
