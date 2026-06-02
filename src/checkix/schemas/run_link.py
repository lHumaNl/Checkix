"""Run link schemas for shareable checklist execution."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


class RunLinkOut(ORMSchema):
    id: int
    template_id: int = Field(validation_alias="checklist_template_id")
    checklist_template_name: str = ""
    unique_id: str
    token: Optional[str] = Field(default=None, validation_alias="unique_id")
    name: Optional[str] = None
    access_type: str = "public"
    access_type_display: str = "Public"
    max_uses: Optional[int] = None
    usage_count: int = 0
    use_count: int = Field(default=0, validation_alias="usage_count")
    expires_at: Optional[datetime] = None
    is_expired: bool = False
    is_max_uses_reached: bool = False
    is_valid: bool = True
    created_by: Optional[int] = Field(default=None, validation_alias="created_by_id")
    created_by_email: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RunLinkCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: int
    name: Optional[str] = None
    access_type: str = "public"
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None


class RunLinkUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None
