"""Tag schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


class TagOut(ORMSchema):
    id: int
    name: str
    color: Optional[str] = None
    description: Optional[str] = None
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None


class TagCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    color: Optional[str] = None
    description: Optional[str] = None


class TagUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
