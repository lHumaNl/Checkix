"""Service layer for todo list and item CRUD, bulk operations, and stats."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Sequence, cast

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from checkix.models.tag import Tag
from checkix.models.todo import TodoItem, TodoList, todo_lists_tags
from checkix.models.user import User


class TodoService:
    """Async service for todo list lifecycle operations."""

    # ------------------------------------------------------------------
    # List CRUD
    # ------------------------------------------------------------------

    @staticmethod
    async def create_list(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> TodoList:
        """Create a new todo list, handle tags, and return it."""

        todo_list = TodoList(
            name=data.name,
            description=getattr(data, "description", None),
            user_id=user.id,
            folder_id=getattr(data, "folder_id", None),
            status=getattr(data, "status", "active"),
            due_date=getattr(data, "due_date", None),
            priority=getattr(data, "priority", "medium"),
            icon=getattr(data, "icon", None),
            is_favorite=getattr(data, "is_favorite", False),
            is_deleted=False,
        )
        db.add(todo_list)
        await db.flush()

        # -- Resolve / create tags by name ----------------------------------
        tag_names: list[str] = getattr(data, "tags", []) or []
        if tag_names:
            tag_objs: list[Tag] = []
            for name in tag_names:
                stmt = select(Tag).where(
                    and_(Tag.name == name, Tag.user_id == user.id)
                )
                result = await db.execute(stmt)
                tag = result.scalar_one_or_none()
                if tag is None:
                    tag = Tag(name=name, user_id=user.id)
                    db.add(tag)
                    await db.flush()
                tag_objs.append(tag)
            todo_list.tags = tag_objs

        await db.flush()
        await db.refresh(todo_list)
        return todo_list

    @staticmethod
    async def get_lists(
        db: AsyncSession,
        user: User,
        filters: Any | None = None,
    ) -> Sequence[TodoList]:
        """Return all non-deleted todo lists owned by *user*, optionally filtered."""

        stmt = (
            select(TodoList)
            .where(
                and_(
                    TodoList.user_id == user.id,
                    TodoList.is_deleted.is_(False),
                )
            )
            .order_by(TodoList.created_at.desc())
        )

        if filters is not None:
            folder_id = getattr(filters, "folder_id", None)
            if folder_id is not None:
                stmt = stmt.where(TodoList.folder_id == folder_id)

            status = getattr(filters, "status", None)
            if status is not None:
                stmt = stmt.where(TodoList.status == status)

            is_favorite = getattr(filters, "is_favorite", None)
            if is_favorite is not None:
                stmt = stmt.where(TodoList.is_favorite == is_favorite)

            priority = getattr(filters, "priority", None)
            if priority is not None:
                stmt = stmt.where(TodoList.priority == priority)

            search = getattr(filters, "search", None)
            if search:
                stmt = stmt.where(TodoList.name.ilike(f"%{search}%"))

            tag_id = getattr(filters, "tag_id", None)
            if tag_id is not None:
                stmt = stmt.join(todo_lists_tags).where(
                    todo_lists_tags.c.tag_id == tag_id
                )

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_list(
        db: AsyncSession,
        list_id: int,
        user: User,
    ) -> TodoList:
        """Fetch a single todo list by *id*, verifying ownership."""

        stmt = select(TodoList).where(
            and_(
                TodoList.id == list_id,
                TodoList.user_id == user.id,
            )
        )
        result = await db.execute(stmt)
        todo_list = result.scalar_one_or_none()

        if todo_list is None:
            raise NotFoundException("Todo list not found")
        return todo_list

    @staticmethod
    async def update_list(
        db: AsyncSession,
        todo_list: TodoList,
        data: Any,
    ) -> TodoList:
        """Apply partial updates to an existing todo list."""

        update_fields = [
            "name",
            "description",
            "folder_id",
            "status",
            "due_date",
            "priority",
            "icon",
            "is_favorite",
        ]
        for field in update_fields:
            value = getattr(data, field, None)
            if value is not None:
                setattr(todo_list, field, value)

        # -- Handle tag replacement -----------------------------------------
        tag_names = getattr(data, "tags", None)
        if tag_names is not None:
            user_id = todo_list.user_id
            tag_objs: list[Tag] = []
            for name in tag_names:
                stmt = select(Tag).where(
                    and_(Tag.name == name, Tag.user_id == user_id)
                )
                result = await db.execute(stmt)
                tag = result.scalar_one_or_none()
                if tag is None:
                    tag = Tag(name=name, user_id=user_id)
                    db.add(tag)
                    await db.flush()
                tag_objs.append(tag)
            todo_list.tags = tag_objs

        # Auto-set completed_at when status transitions to completed
        status = getattr(data, "status", None)
        if status == "completed" and todo_list.completed_at is None:
            todo_list.completed_at = datetime.now(timezone.utc)

        await db.flush()
        await db.refresh(todo_list)
        return todo_list

    @staticmethod
    async def delete_list(
        db: AsyncSession,
        todo_list: TodoList,
    ) -> TodoList:
        """Soft-delete a todo list."""

        todo_list.is_deleted = True
        todo_list.deleted_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(todo_list)
        return todo_list

    @staticmethod
    async def restore_list(
        db: AsyncSession,
        todo_list: TodoList,
    ) -> TodoList:
        """Restore a previously soft-deleted todo list."""

        todo_list.is_deleted = False
        todo_list.deleted_at = None
        await db.flush()
        await db.refresh(todo_list)
        return todo_list

    # ------------------------------------------------------------------
    # Item CRUD
    # ------------------------------------------------------------------

    @staticmethod
    async def create_item(
        db: AsyncSession,
        todo_list: TodoList,
        data: Any,
    ) -> TodoItem:
        """Create a single todo item inside a list."""

        # Determine the next order value if not explicitly provided
        order = getattr(data, "order", None)
        if order is None:
            stmt = select(func.coalesce(func.max(TodoItem.order), -1)).where(
                TodoItem.todo_list_id == todo_list.id
            )
            result = await db.execute(stmt)
            max_order = result.scalar() or -1
            order = max_order + 1

        item = TodoItem(
            todo_list_id=todo_list.id,
            title=data.title,
            description=getattr(data, "description", None),
            status=getattr(data, "status", "pending"),
            order=order,
            due_date=getattr(data, "due_date", None),
            priority=getattr(data, "priority", None),
            parent_id=getattr(data, "parent_id", None),
        )
        db.add(item)
        await db.flush()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_item(
        db: AsyncSession,
        item: TodoItem,
        data: Any,
    ) -> TodoItem:
        """Apply partial updates to a todo item."""

        update_fields = [
            "title",
            "description",
            "status",
            "order",
            "due_date",
            "priority",
            "parent_id",
        ]
        for field in update_fields:
            value = getattr(data, field, None)
            if value is not None:
                setattr(item, field, value)

        # Auto-set completed_at when status transitions to completed
        status = getattr(data, "status", None)
        if status == "completed" and item.completed_at is None:
            item.completed_at = datetime.now(timezone.utc)
        elif status in ("pending", "in_progress") and item.completed_at is not None:
            item.completed_at = None

        await db.flush()
        await db.refresh(item)
        return item

    @staticmethod
    async def delete_item(
        db: AsyncSession,
        item: TodoItem,
    ) -> None:
        """Hard-delete a todo item (cascade handles children)."""

        await db.delete(item)
        await db.flush()

    # ------------------------------------------------------------------
    # Bulk item operations
    # ------------------------------------------------------------------

    @staticmethod
    async def bulk_complete_items(
        db: AsyncSession,
        todo_list: TodoList,
        item_ids: list[int],
    ) -> Sequence[TodoItem]:
        """Mark multiple items as completed in a single list."""

        now = datetime.now(timezone.utc)

        stmt = (
            update(TodoItem)
            .where(
                and_(
                    TodoItem.todo_list_id == todo_list.id,
                    TodoItem.id.in_(item_ids),
                )
            )
            .values(status="completed", completed_at=now)
        )
        await db.execute(stmt)
        await db.flush()

        # Fetch updated items
        result = await db.execute(
            select(TodoItem).where(
                TodoItem.todo_list_id == todo_list.id,
                TodoItem.id.in_(item_ids),
            )
        )
        return result.scalars().all()

    @staticmethod
    async def bulk_uncomplete_items(
        db: AsyncSession,
        todo_list: TodoList,
        item_ids: list[int],
    ) -> Sequence[TodoItem]:
        """Mark multiple items as pending (uncompleted) in a single list."""

        stmt = (
            update(TodoItem)
            .where(
                and_(
                    TodoItem.todo_list_id == todo_list.id,
                    TodoItem.id.in_(item_ids),
                )
            )
            .values(status="pending", completed_at=None)
        )
        await db.execute(stmt)
        await db.flush()

        # Fetch updated items
        result = await db.execute(
            select(TodoItem).where(
                TodoItem.todo_list_id == todo_list.id,
                TodoItem.id.in_(item_ids),
            )
        )
        return result.scalars().all()

    @staticmethod
    async def reorder_items(
        db: AsyncSession,
        todo_list: TodoList,
        ordered_ids: list[int],
    ) -> Sequence[TodoItem]:
        """Reorder items within a list according to the provided id sequence.

        *ordered_ids* is a list of item IDs in the desired order. Each item's
        ``order`` field is set to its index in that list.
        """

        # Validate that all IDs belong to the list
        result = await db.execute(
            select(TodoItem.id).where(TodoItem.todo_list_id == todo_list.id)
        )
        existing_ids = {row[0] for row in result.all()}

        requested_set = set(ordered_ids)
        unknown = requested_set - existing_ids
        if unknown:
            raise BadRequestException(
                f"Item IDs do not belong to this list: {unknown}"
            )

        # Apply new order values
        for index, item_id in enumerate(ordered_ids):
            await db.execute(
                update(TodoItem)
                .where(TodoItem.id == item_id)
                .values(order=index)
            )

        await db.flush()

        # Return items in the new order
        updated_result = await db.execute(
            select(TodoItem)
            .where(TodoItem.id.in_(ordered_ids))
            .order_by(TodoItem.order)
        )
        return cast(Sequence[TodoItem], updated_result.scalars().all())

    # ------------------------------------------------------------------
    # Duplication
    # ------------------------------------------------------------------

    @staticmethod
    async def duplicate_list(
        db: AsyncSession,
        todo_list: TodoList,
        name: str,
        user: User,
    ) -> TodoList:
        """Deep-copy a todo list (with items) for *user* under a new *name*."""

        # 1. Create the new list header
        new_list = TodoList(
            name=name,
            description=todo_list.description,
            user_id=user.id,
            folder_id=todo_list.folder_id,
            status="active",
            due_date=todo_list.due_date,
            priority=todo_list.priority,
            icon=todo_list.icon,
            is_favorite=False,
            is_deleted=False,
        )
        db.add(new_list)
        await db.flush()

        # 2. Copy tag associations
        new_list.tags = list(todo_list.tags)

        # 3. Copy items recursively (root items first, children follow)
        for original_item in todo_list.items:
            if original_item.parent_id is None:
                await TodoService._copy_item(db, new_list, original_item, None)

        await db.flush()
        await db.refresh(new_list)
        return new_list

    @staticmethod
    async def _copy_item(
        db: AsyncSession,
        new_list: TodoList,
        original: TodoItem,
        new_parent: TodoItem | None,
    ) -> TodoItem:
        """Recursively copy a single item and its children."""

        new_item = TodoItem(
            todo_list_id=new_list.id,
            parent_id=new_parent.id if new_parent else None,
            title=original.title,
            description=original.description,
            status="pending",
            order=original.order,
            due_date=original.due_date,
            priority=original.priority,
        )
        db.add(new_item)
        await db.flush()

        for child in original.children:
            await TodoService._copy_item(db, new_list, child, new_item)

        return new_item

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------

    @staticmethod
    async def get_list_stats(
        db: AsyncSession,
        todo_list: TodoList,
    ) -> dict[str, Any]:
        """Return aggregate statistics for a single todo list."""

        base_filter = TodoItem.todo_list_id == todo_list.id

        total_stmt = select(func.count(TodoItem.id)).where(base_filter)
        completed_stmt = select(func.count(TodoItem.id)).where(
            and_(base_filter, TodoItem.status == "completed")
        )
        pending_stmt = select(func.count(TodoItem.id)).where(
            and_(base_filter, TodoItem.status == "pending")
        )
        in_progress_stmt = select(func.count(TodoItem.id)).where(
            and_(base_filter, TodoItem.status == "in_progress")
        )
        overdue_stmt = select(func.count(TodoItem.id)).where(
            and_(
                base_filter,
                TodoItem.status != "completed",
                TodoItem.due_date.isnot(None),
                TodoItem.due_date < datetime.now(timezone.utc),
            )
        )

        total = (await db.execute(total_stmt)).scalar() or 0
        completed = (await db.execute(completed_stmt)).scalar() or 0
        pending = (await db.execute(pending_stmt)).scalar() or 0
        in_progress = (await db.execute(in_progress_stmt)).scalar() or 0
        overdue = (await db.execute(overdue_stmt)).scalar() or 0

        completion_rate = (completed / total * 100) if total > 0 else 0.0

        return {
            "list_id": todo_list.id,
            "list_name": todo_list.name,
            "total_items": total,
            "completed_items": completed,
            "pending_items": pending,
            "in_progress_items": in_progress,
            "overdue_items": overdue,
            "completion_rate": round(completion_rate, 2),
        }

    @staticmethod
    async def get_user_stats(
        db: AsyncSession,
        user: User,
    ) -> dict[str, Any]:
        """Return aggregate todo statistics across all lists for *user*."""

        list_base = and_(
            TodoList.user_id == user.id,
            TodoList.is_deleted.is_(False),
        )

        # List counts
        total_lists_stmt = select(func.count(TodoList.id)).where(list_base)
        active_lists_stmt = select(func.count(TodoList.id)).where(
            and_(list_base, TodoList.status == "active")
        )
        completed_lists_stmt = select(func.count(TodoList.id)).where(
            and_(list_base, TodoList.status == "completed")
        )
        favorite_lists_stmt = select(func.count(TodoList.id)).where(
            and_(list_base, TodoList.is_favorite.is_(True))
        )

        total_lists = (await db.execute(total_lists_stmt)).scalar() or 0
        active_lists = (await db.execute(active_lists_stmt)).scalar() or 0
        completed_lists = (await db.execute(completed_lists_stmt)).scalar() or 0
        favorite_lists = (await db.execute(favorite_lists_stmt)).scalar() or 0

        # Item counts across all user lists
        item_base = and_(
            TodoItem.todo_list_id == TodoList.id,
            TodoList.user_id == user.id,
            TodoList.is_deleted.is_(False),
        )

        total_items_stmt = select(func.count(TodoItem.id)).where(item_base)
        completed_items_stmt = select(func.count(TodoItem.id)).where(
            and_(item_base, TodoItem.status == "completed")
        )
        overdue_items_stmt = select(func.count(TodoItem.id)).where(
            and_(
                item_base,
                TodoItem.status != "completed",
                TodoItem.due_date.isnot(None),
                TodoItem.due_date < datetime.now(timezone.utc),
            )
        )

        total_items = (await db.execute(total_items_stmt)).scalar() or 0
        completed_items = (await db.execute(completed_items_stmt)).scalar() or 0
        overdue_items = (await db.execute(overdue_items_stmt)).scalar() or 0

        completion_rate = (
            (completed_items / total_items * 100) if total_items > 0 else 0.0
        )

        return {
            "user_id": user.id,
            "total_lists": total_lists,
            "active_lists": active_lists,
            "completed_lists": completed_lists,
            "favorite_lists": favorite_lists,
            "total_items": total_items,
            "completed_items": completed_items,
            "overdue_items": overdue_items,
            "completion_rate": round(completion_rate, 2),
        }
