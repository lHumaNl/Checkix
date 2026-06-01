"""Router module: search."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.models.checklist import ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.todo import TodoList
from checkix.models.user import User
from checkix.schemas.checklist import ChecklistTemplateListOut
from checkix.schemas.checklist_instance import ChecklistInstanceOut
from checkix.schemas.todo import TodoListOut

router = APIRouter(tags=["search"])


@router.get("/", response_model=None)
async def search_all(
    q: Annotated[str, Query(min_length=1, description="Search query")],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Search across templates, instances, and todos for the current user.

    Uses case-insensitive ``ilike`` matching on name/title fields.
    """
    pattern = f"%{q}%"

    # Search templates
    templates_query = (
        select(ChecklistTemplate)
        .where(
            ChecklistTemplate.user_id == current_user.id,
            ChecklistTemplate.is_deleted.is_(False),
            or_(
                ChecklistTemplate.name.ilike(pattern),
                ChecklistTemplate.description.ilike(pattern),
            ),
        )
        .order_by(ChecklistTemplate.created_at.desc())
    )
    templates_page = await paginate(db, templates_query, pagination)

    # Search instances
    instances_query = (
        select(ChecklistInstance)
        .where(
            ChecklistInstance.user_id == current_user.id,
            or_(
                ChecklistInstance.name.ilike(pattern),
                ChecklistInstance.notes.ilike(pattern),
            ),
        )
        .order_by(ChecklistInstance.created_at.desc())
    )
    instances_page = await paginate(db, instances_query, pagination)

    # Search todo lists
    todos_query = (
        select(TodoList)
        .where(
            TodoList.user_id == current_user.id,
            TodoList.is_deleted.is_(False),
            or_(
                TodoList.name.ilike(pattern),
                TodoList.description.ilike(pattern),
            ),
        )
        .order_by(TodoList.created_at.desc())
    )
    todos_page = await paginate(db, todos_query, pagination)

    return {
        "templates": templates_page,
        "instances": instances_page,
        "todos": todos_page,
    }
