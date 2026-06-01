"""Checklist template, version, item, and placeholder schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema
from checkix.schemas.tag import TagOut


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------

class ChecklistTemplateListOut(ORMSchema):
    id: int
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    is_favorite: bool = False
    icon: Optional[str] = None
    category: Optional[str] = None
    sequential_mode: bool = False
    created_at: Optional[datetime] = None


class ChecklistTemplateOut(ChecklistTemplateListOut):
    tags: list[TagOut] = []
    current_version: Optional[ChecklistVersionOut] = None


class ChecklistTemplateCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[list[int]] = None
    status: Optional[str] = None
    sequential_mode: bool = False
    icon: Optional[str] = None
    category: Optional[str] = None


class ChecklistTemplateUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    description: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[list[int]] = None
    status: Optional[str] = None
    sequential_mode: Optional[bool] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    is_favorite: Optional[bool] = None


# ---------------------------------------------------------------------------
# Version
# ---------------------------------------------------------------------------

class ChecklistVersionOut(ORMSchema):
    id: int
    version_number: int
    changelog: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None


class ChecklistVersionCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    changelog: Optional[str] = None


# ---------------------------------------------------------------------------
# Item
# ---------------------------------------------------------------------------

class ChecklistItemOut(ORMSchema):
    id: int
    title: str
    description: Optional[str] = None
    order: int = 0
    is_required: bool = True
    priority: Optional[str] = None
    is_halt: bool = False
    halt_message: Optional[str] = None
    children: list[ChecklistItemOut] = []


class ChecklistItemCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: Optional[str] = None
    order: int = 0
    is_required: bool = True
    priority: Optional[str] = None
    is_halt: bool = False
    halt_message: Optional[str] = None
    children: Optional[list[ChecklistItemCreate]] = None


class ChecklistItemUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    is_required: Optional[bool] = None
    priority: Optional[str] = None
    is_halt: Optional[bool] = None
    halt_message: Optional[str] = None


# ---------------------------------------------------------------------------
# Placeholder
# ---------------------------------------------------------------------------

class PlaceholderOut(ORMSchema):
    id: int
    name: str
    placeholder_type: Optional[str] = None
    default_value: Optional[str] = None
    is_required: bool = False
    order: int = 0


class PlaceholderCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    placeholder_type: Optional[str] = None
    default_value: Optional[str] = None
    is_required: bool = False
    order: int = 0


class PlaceholderOptionOut(ORMSchema):
    id: int
    value: str
    label: Optional[str] = None
    order: int = 0
