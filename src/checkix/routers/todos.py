"""Router module: todos."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import BadRequestException, NotFoundException
from checkix.models.todo import TodoItem, TodoList
from checkix.models.tag import Tag
from checkix.models.user import User
from checkix.schemas.todo import (
    TodoItemCreate,
    TodoItemOut,
    TodoItemUpdate,
    TodoListCreate,
    TodoListOut,
    TodoListUpdate,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["todos"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_list_or_404(
    db: AsyncSession,
    list_id: int,
    user_id: int,
    *,
    allow_deleted: bool = False,
) -> TodoList:
    """Fetch a todo list owned by *user_id* or raise 404."""
    stmt = select(TodoList).where(
        TodoList.id == list_id,
        TodoList.user_id == user_id,
    )
    if not allow_deleted:
        stmt = stmt.where(TodoList.is_deleted.is_(False))

    result = await db.execute(stmt)
    todo_list = result.scalar_one_or_none()
    if todo_list is None:
        raise NotFoundException(detail="Todo list not found")
    return todo_list


async def _get_item_or_404(
    db: AsyncSession,
    list_id: int,
    item_id: int,
) -> TodoItem:
    """Fetch a todo item belonging to *list_id* or raise 404."""
    result = await db.execute(
        select(TodoItem).where(
            TodoItem.id == item_id,
            TodoItem.todo_list_id == list_id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise NotFoundException(detail="Todo item not found")
    return item


# ---------------------------------------------------------------------------
# Todo List CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=None)
async def list_todo_lists(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    status: Annotated[Optional[str], Query()] = None,
    priority: Annotated[Optional[str], Query()] = None,
    folder_id: Annotated[Optional[int], Query()] = None,
) -> dict:
    """Return a paginated list of todo lists for the current user."""
    query = (
        select(TodoList)
        .where(
            TodoList.user_id == current_user.id,
            TodoList.is_deleted.is_(False),
        )
        .order_by(TodoList.created_at.desc())
    )
    if status is not None:
        query = query.where(TodoList.status == status)
    if priority is not None:
        query = query.where(TodoList.priority == priority)
    if folder_id is not None:
        query = query.where(TodoList.folder_id == folder_id)

    return await paginate(db, query, pagination)


@router.post("/", response_model=TodoListOut, status_code=201)
async def create_todo_list(
    body: TodoListCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TodoList:
    """Create a new todo list."""
    todo_list = TodoList(
        name=body.name,
        description=body.description,
        priority=body.priority or "medium",
        icon=body.icon,
        folder_id=body.folder_id,
        due_date=body.due_date,
        user_id=current_user.id,
    )
    db.add(todo_list)
    await db.flush()

    if body.tags:
        result = await db.execute(
            select(Tag).where(Tag.id.in_(body.tags), Tag.user_id == current_user.id)
        )
        todo_list.tags = list(result.scalars().all())

    await db.commit()
    await db.refresh(todo_list)
    return todo_list


@router.get("/{list_id}/", response_model=TodoListOut)
async def get_todo_list(
    list_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TodoList:
    """Return the detail of a single todo list."""
    return await _get_list_or_404(db, list_id, current_user.id)


@router.put("/{list_id}/", response_model=TodoListOut)
async def update_todo_list(
    list_id: int,
    body: TodoListUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TodoList:
    """Update an existing todo list."""
    todo_list = await _get_list_or_404(db, list_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tags", None)

    for field, value in update_data.items():
        setattr(todo_list, field, value)

    if tag_ids is not None:
        result = await db.execute(
            select(Tag).where(Tag.id.in_(tag_ids), Tag.user_id == current_user.id)
        )
        todo_list.tags = list(result.scalars().all())

    await db.commit()
    await db.refresh(todo_list)
    return todo_list


@router.delete("/{list_id}/", response_model=MessageResponse)
async def delete_todo_list(
    list_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Soft-delete a todo list."""
    todo_list = await _get_list_or_404(db, list_id, current_user.id)

    if todo_list.is_deleted:
        raise BadRequestException(detail="Todo list is already deleted")

    todo_list.is_deleted = True
    todo_list.deleted_at = datetime.now()
    await db.commit()
    return MessageResponse(message="Todo list deleted")


@router.post("/{list_id}/restore/", response_model=TodoListOut)
async def restore_todo_list(
    list_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TodoList:
    """Restore a previously soft-deleted todo list."""
    todo_list = await _get_list_or_404(
        db, list_id, current_user.id, allow_deleted=True
    )

    if not todo_list.is_deleted:
        raise BadRequestException(detail="Todo list is not deleted")

    todo_list.is_deleted = False
    todo_list.deleted_at = None
    await db.commit()
    await db.refresh(todo_list)
    return todo_list


# ---------------------------------------------------------------------------
# Todo Items (nested under a list)
# ---------------------------------------------------------------------------


@router.get("/{list_id}/items/", response_model=list[TodoItemOut])
async def list_items(
    list_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TodoItem]:
    """Return all items for a todo list."""
    await _get_list_or_404(db, list_id, current_user.id)

    result = await db.execute(
        select(TodoItem)
        .where(TodoItem.todo_list_id == list_id)
        .order_by(TodoItem.order)
    )
    return list(result.scalars().all())


@router.post("/{list_id}/items/", response_model=TodoItemOut, status_code=201)
async def create_item(
    list_id: int,
    body: TodoItemCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TodoItem:
    """Create a new item in a todo list."""
    await _get_list_or_404(db, list_id, current_user.id)

    item = TodoItem(
        todo_list_id=list_id,
        title=body.title,
        description=body.description,
        order=body.order,
        priority=body.priority,
        due_date=body.due_date,
        parent_id=body.parent_id,
        status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{list_id}/items/{item_id}/", response_model=TodoItemOut)
async def update_item(
    list_id: int,
    item_id: int,
    body: TodoItemUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TodoItem:
    """Update an existing todo item."""
    await _get_list_or_404(db, list_id, current_user.id)
    item = await _get_item_or_404(db, list_id, item_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{list_id}/items/{item_id}/", response_model=MessageResponse)
async def delete_item(
    list_id: int,
    item_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete a todo item permanently."""
    await _get_list_or_404(db, list_id, current_user.id)
    item = await _get_item_or_404(db, list_id, item_id)

    await db.delete(item)
    await db.commit()
    return MessageResponse(message="Todo item deleted")


@router.post("/{list_id}/items/bulk_complete/", response_model=list[TodoItemOut])
async def bulk_complete_items(
    list_id: int,
    item_ids: list[int],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[TodoItem]:
    """Mark multiple todo items as completed."""
    await _get_list_or_404(db, list_id, current_user.id)

    await db.execute(
        update(TodoItem)
        .where(
            TodoItem.id.in_(item_ids),
            TodoItem.todo_list_id == list_id,
        )
        .values(status="completed", completed_at=datetime.now())
    )
    await db.commit()

    # Re-fetch to get full ORM objects with relationships
    items_result = await db.execute(
        select(TodoItem).where(
            TodoItem.id.in_(item_ids),
            TodoItem.todo_list_id == list_id,
        )
    )
    return list(items_result.scalars().all())
