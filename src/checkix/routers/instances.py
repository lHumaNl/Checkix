"""Router module: checklist instances.

Provides endpoints for managing concrete runs of checklist templates,
including creation from a version, status transitions, item toggling,
and completion log access.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import BadRequestException, NotFoundException
from checkix.models.checklist import ChecklistItem, ChecklistVersion
from checkix.models.checklist_instance import (
    ChecklistInstance,
    ChecklistItemInstance,
    CompletionLog,
)
from checkix.models.user import User
from checkix.schemas.checklist_instance import (
    ChecklistInstanceCreate,
    ChecklistInstanceOut,
    ChecklistItemInstanceOut,
    CompletionLogOut,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["instances"])

# Allowed status transitions mapped from current status -> set of valid next statuses.
_VALID_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"in_progress", "cancelled"},
    "in_progress": {"completed", "cancelled"},
    "completed": set(),   # terminal
    "cancelled": set(),   # terminal
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_owned_instance(
    db: AsyncSession,
    instance_id: int,
    user: User,
) -> ChecklistInstance:
    """Fetch a ChecklistInstance owned by *user*, raising 404 if missing."""
    result = await db.execute(
        select(ChecklistInstance).where(
            ChecklistInstance.id == instance_id,
            ChecklistInstance.user_id == user.id,
        )
    )
    instance = result.scalar_one_or_none()
    if instance is None:
        raise NotFoundException(detail="Instance not found")
    return instance


async def _recalculate_progress(db: AsyncSession, instance_id: int) -> int:
    """Re-calculate and persist progress_percentage for an instance.

    Returns the new percentage (0-100).
    """
    total_result = await db.execute(
        select(func.count()).select_from(ChecklistItemInstance).where(
            ChecklistItemInstance.instance_id == instance_id,
            ChecklistItemInstance.parent_id.is_(None),
        )
    )
    total: int = total_result.scalar_one()

    if total == 0:
        percentage = 0
    else:
        completed_result = await db.execute(
            select(func.count()).select_from(ChecklistItemInstance).where(
                ChecklistItemInstance.instance_id == instance_id,
                ChecklistItemInstance.parent_id.is_(None),
                ChecklistItemInstance.is_completed.is_(True),
            )
        )
        completed: int = completed_result.scalar_one()
        percentage = int((completed / total) * 100)

    await db.execute(
        ChecklistInstance.__table__.update()  # type: ignore[attr-defined]
        .where(ChecklistInstance.id == instance_id)
        .values(progress_percentage=percentage)
    )
    return percentage


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=None)
async def list_instances(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Annotated[Optional[str], Query(description="Filter by status")] = None,
    pagination: PaginationParams = Depends(),
) -> dict:
    """Return a paginated list of checklist instances for the current user.

    Supports optional filtering by status.
    """
    query = (
        select(ChecklistInstance)
        .where(ChecklistInstance.user_id == current_user.id)
        .order_by(ChecklistInstance.created_at.desc())
    )
    if status is not None:
        query = query.where(ChecklistInstance.status == status)

    return await paginate(db, query, pagination)


@router.post("/", response_model=ChecklistInstanceOut, status_code=201)
async def create_instance(
    body: ChecklistInstanceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistInstance:
    """Create a new checklist instance from a template.

    If *version_id* is not supplied, the template's ``current_version_id``
    is used. All items from the chosen version are copied into
    ``ChecklistItemInstance`` rows, preserving the tree structure.
    """
    # Resolve the version to copy items from.
    if body.version_id is not None:
        version_result = await db.execute(
            select(ChecklistVersion).where(ChecklistVersion.id == body.version_id)
        )
        version = version_result.scalar_one_or_none()
        if version is None:
            raise NotFoundException(detail="Version not found")
    else:
        from checkix.models.checklist import ChecklistTemplate

        template_result = await db.execute(
            select(ChecklistTemplate).where(
                ChecklistTemplate.id == body.template_id
            )
        )
        template = template_result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(detail="Template not found")

        if template.current_version_id is None:
            raise BadRequestException(
                detail="Template has no active version"
            )
        version_result = await db.execute(
            select(ChecklistVersion).where(
                ChecklistVersion.id == template.current_version_id
            )
        )
        version = version_result.scalar_one_or_none()
        if version is None:
            raise NotFoundException(detail="Template current version not found")

    # Determine the instance name.
    instance_name = body.name
    if instance_name is None:
        instance_name = (
            version.template.name if version.template else "Untitled Instance"
        )

    # Create the instance header.
    instance = ChecklistInstance(
        template_id=body.template_id,
        version_id=version.id,
        name=instance_name,
        user_id=current_user.id,
        status="draft",
        notes=body.notes,
    )
    db.add(instance)
    await db.flush()

    # Copy all version items into item instances, preserving tree structure.
    items_result = await db.execute(
        select(ChecklistItem)
        .where(ChecklistItem.version_id == version.id)
        .order_by(ChecklistItem.order)
    )
    source_items = list(items_result.scalars().all())

    # Map original item id -> new ChecklistItemInstance id for parent linking.
    id_map: dict[int, int] = {}
    for src in source_items:
        item_inst = ChecklistItemInstance(
            instance_id=instance.id,
            item_id=src.id,
            title=src.title,
            description=src.description,
            order=src.order,
            is_completed=False,
            placeholder_value=None,
            parent_id=id_map.get(src.parent_id) if src.parent_id else None,
            is_visible=True,
        )
        db.add(item_inst)
        await db.flush()
        id_map[src.id] = item_inst.id

    await db.commit()
    await db.refresh(instance)
    return instance


@router.get("/{instance_id}/", response_model=ChecklistInstanceOut)
async def get_instance(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistInstance:
    """Return details of a single checklist instance."""
    return await _get_owned_instance(db, instance_id, current_user)


@router.delete("/{instance_id}/", response_model=MessageResponse)
async def delete_instance(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete a checklist instance owned by the current user."""
    instance = await _get_owned_instance(db, instance_id, current_user)
    await db.delete(instance)
    await db.commit()
    return MessageResponse(message="Instance deleted")


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------


async def _transition_status(
    db: AsyncSession,
    instance: ChecklistInstance,
    target_status: str,
    user_id: int,
) -> ChecklistInstance:
    """Validate and apply a status transition, writing a CompletionLog entry."""
    allowed = _VALID_TRANSITIONS.get(instance.status, set())
    if target_status not in allowed:
        raise BadRequestException(
            detail=f"Cannot transition instance from '{instance.status}' to '{target_status}'"
        )

    now = datetime.now(timezone.utc)
    instance.status = target_status

    if target_status == "in_progress":
        instance.started_at = now
    elif target_status == "completed":
        instance.completed_at = now
        instance.progress_percentage = 100

    log = CompletionLog(
        instance_id=instance.id,
        item_instance_id=None,
        action=f"status:{target_status}",
        user_id=user_id,
        timestamp=now,
        notes=None,
    )
    db.add(log)
    await db.commit()
    await db.refresh(instance)
    return instance


@router.post("/{instance_id}/start/", response_model=ChecklistInstanceOut)
async def start_instance(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistInstance:
    """Change instance status to *in_progress*."""
    instance = await _get_owned_instance(db, instance_id, current_user)
    return await _transition_status(db, instance, "in_progress", current_user.id)


@router.post("/{instance_id}/complete/", response_model=ChecklistInstanceOut)
async def complete_instance(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistInstance:
    """Change instance status to *completed* and set progress to 100%."""
    instance = await _get_owned_instance(db, instance_id, current_user)
    return await _transition_status(db, instance, "completed", current_user.id)


@router.post("/{instance_id}/cancel/", response_model=ChecklistInstanceOut)
async def cancel_instance(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistInstance:
    """Change instance status to *cancelled*."""
    instance = await _get_owned_instance(db, instance_id, current_user)
    return await _transition_status(db, instance, "cancelled", current_user.id)


# ---------------------------------------------------------------------------
# Item instances
# ---------------------------------------------------------------------------


@router.get(
    "/{instance_id}/items/",
    response_model=list[ChecklistItemInstanceOut],
)
async def list_item_instances(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChecklistItemInstance]:
    """Return all item instances belonging to a checklist instance."""
    instance = await _get_owned_instance(db, instance_id, current_user)

    result = await db.execute(
        select(ChecklistItemInstance)
        .where(ChecklistItemInstance.instance_id == instance.id)
        .order_by(ChecklistItemInstance.order)
    )
    return list(result.scalars().all())


@router.post(
    "/{instance_id}/items/{item_instance_id}/toggle/",
    response_model=ChecklistItemInstanceOut,
)
async def toggle_item(
    instance_id: int,
    item_instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistItemInstance:
    """Toggle the completion state of a single item instance.

    After toggling, the parent instance's ``progress_percentage`` is
    recalculated and a ``CompletionLog`` entry is written.
    """
    instance = await _get_owned_instance(db, instance_id, current_user)

    result = await db.execute(
        select(ChecklistItemInstance).where(
            ChecklistItemInstance.id == item_instance_id,
            ChecklistItemInstance.instance_id == instance.id,
        )
    )
    item_instance = result.scalar_one_or_none()
    if item_instance is None:
        raise NotFoundException(detail="Item instance not found")

    if instance.status != "in_progress":
        raise BadRequestException(
            detail="Cannot toggle items on an instance that is not in progress"
        )

    now = datetime.now(timezone.utc)
    item_instance.is_completed = not item_instance.is_completed
    item_instance.completed_at = now if item_instance.is_completed else None

    action = "item:completed" if item_instance.is_completed else "item:unchecked"
    log = CompletionLog(
        instance_id=instance.id,
        item_instance_id=item_instance.id,
        action=action,
        user_id=current_user.id,
        timestamp=now,
        notes=None,
    )
    db.add(log)

    await db.flush()
    await _recalculate_progress(db, instance.id)

    await db.commit()
    await db.refresh(item_instance)
    return item_instance


# ---------------------------------------------------------------------------
# Completion logs
# ---------------------------------------------------------------------------


@router.get(
    "/{instance_id}/logs/",
    response_model=list[CompletionLogOut],
)
async def list_completion_logs(
    instance_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[CompletionLog]:
    """Return the completion / audit log entries for a checklist instance."""
    instance = await _get_owned_instance(db, instance_id, current_user)

    result = await db.execute(
        select(CompletionLog)
        .where(CompletionLog.instance_id == instance.id)
        .order_by(CompletionLog.timestamp.desc())
    )
    return list(result.scalars().all())
