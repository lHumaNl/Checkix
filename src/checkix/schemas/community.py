"""Community template and rating schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


class CommunityTemplateOut(ORMSchema):
    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    downloads: int = 0
    rating_avg: Optional[float] = None
    rating_count: int = 0
    version: Optional[str] = None
    is_published: bool = True
    created_at: Optional[datetime] = None


class CommunityTemplateCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    version: Optional[str] = None
    is_published: bool = True


class TemplateRatingOut(ORMSchema):
    id: int
    template_id: int
    user_id: Optional[int] = None
    score: int
    review: Optional[str] = None
    created_at: Optional[datetime] = None


class TemplateRatingCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: int
    score: int
    review: Optional[str] = None
