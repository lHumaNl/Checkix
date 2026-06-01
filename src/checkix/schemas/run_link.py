"""Run link schemas for shareable checklist execution."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


class RunLinkOut(ORMSchema):
    id: int
    template_id: int = Field(validation_alias='checklist_template_id')
    token: Optional[str] = Field(default=None, validation_alias='unique_id')
    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None
    use_count: int = Field(default=0, validation_alias='usage_count')
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class RunLinkCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: int
    name: Optional[str] = None
    is_active: bool = True
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None


class RunLinkUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None
