"""Todo list and item schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


# ---------------------------------------------------------------------------
# Todo List
# ---------------------------------------------------------------------------

class TodoListOut(ORMSchema):
    id: int
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    is_favorite: bool = False
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    items_count: int = 0
    progress_percentage: float = 0.0


class TodoListCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: Optional[str] = None
    priority: Optional[str] = None
    icon: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[list[int]] = None
    due_date: Optional[datetime] = None


class TodoListUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    is_favorite: Optional[bool] = None
    icon: Optional[str] = None
    folder_id: Optional[int] = None
    tags: Optional[list[int]] = None
    due_date: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Todo Item
# ---------------------------------------------------------------------------

class TodoItemOut(ORMSchema):
    id: int
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    order: int = 0
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    parent_id: Optional[int] = None
    is_completed: bool = False


class TodoItemCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: Optional[str] = None
    order: int = 0
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    parent_id: Optional[int] = None


class TodoItemUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    order: Optional[int] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    parent_id: Optional[int] = None
    is_completed: Optional[bool] = None
