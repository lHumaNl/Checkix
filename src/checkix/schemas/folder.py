"""Folder schemas with recursive tree support."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


class FolderOut(ORMSchema):
    id: int
    name: str
    user_id: Optional[int] = None
    parent_id: Optional[int] = None
    icon: Optional[str] = None
    order: Optional[int] = None


class FolderCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    parent_id: Optional[int] = None
    icon: Optional[str] = None


class FolderUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    parent_id: Optional[int] = None
    icon: Optional[str] = None
    order: Optional[int] = None


class FolderTreeOut(FolderOut):
    children: list[FolderTreeOut] = []
