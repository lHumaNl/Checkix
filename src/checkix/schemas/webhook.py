"""Webhook and webhook event schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


class WebhookOut(ORMSchema):
    id: int
    url: str = Field(validation_alias='endpoint_url')
    name: Optional[str] = None
    events: Optional[str] = Field(default=None, validation_alias='event_type')
    is_active: bool = True
    secret: Optional[str] = None
    created_at: Optional[datetime] = None


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
    event_type: Optional[str] = None
    payload: Optional[dict] = None
    status: Optional[str] = None
    attempts: int = Field(default=0, validation_alias='retry_count')
    last_attempt_at: Optional[datetime] = Field(default=None, validation_alias='sent_at')
    created_at: Optional[datetime] = None
