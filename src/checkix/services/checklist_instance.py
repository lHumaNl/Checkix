"""Service layer for checklist instance lifecycle: creation, status transitions, and progress tracking."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from checkix.exceptions import BadRequestException, ForbiddenException, NotFoundException
from checkix.models.checklist import ChecklistItem, ChecklistTemplate, ChecklistVersion
from checkix.models.checklist_instance import (
    ChecklistInstance,
    ChecklistItemInstance,
    CompletionLog,
)
from checkix.models.user import User

if TYPE_CHECKING:
    pass

# Valid target statuses mapped to the set of source statuses from which
# the transition is permitted.
_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "in_progress": {"draft", "paused"},
    "paused": {"in_progress"},
    "completed": {"in_progress"},
    "cancelled": {"draft", "in_progress", "paused"},
}

# Human-readable labels written to CompletionLog on each transition.
_TRANSITION_LABELS: dict[str, str] = {
    "in_progress": "started",
    "paused": "paused",
    "completed": "completed",
    "cancelled": "cancelled",
}


class ChecklistInstanceService:
    """Async service grouping checklist-instance CRUD and lifecycle operations."""

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    async def create_from_template(
        db: AsyncSession,
        user: User,
        template_id: int,
        version_id: int | None = None,
        name: str | None = None,
        notes: str | None = None,
    ) -> ChecklistInstance:
        """Create a new checklist instance from a template version.

        If *version_id* is ``None`` the template's ``current_version_id``
        is used.  All items from the chosen version are deep-copied into
        ``ChecklistItemInstance`` rows (preserving hierarchy via
        ``parent_id``).

        Returns the persisted ``ChecklistInstance``.
        """
        # -- resolve template ------------------------------------------------
        tmpl_result = await db.execute(
            select(ChecklistTemplate).where(
                ChecklistTemplate.id == template_id,
                ChecklistTemplate.is_deleted.is_(False),
            )
        )
        template: ChecklistTemplate | None = tmpl_result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(f"Template {template_id} not found")
        if template.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to use this template")

        # -- resolve version -------------------------------------------------
        effective_version_id = version_id or template.current_version_id
        if effective_version_id is None:
            raise BadRequestException(
                "Template has no active version and no version_id was provided"
            )

        version_result = await db.execute(
            select(ChecklistVersion)
            .where(ChecklistVersion.id == effective_version_id)
            .options(selectinload(ChecklistVersion.items))
        )
        version: ChecklistVersion | None = version_result.scalar_one_or_none()
        if version is None:
            raise NotFoundException(f"Version {effective_version_id} not found")

        # -- create instance header ------------------------------------------
        instance_name = name or template.name
        instance = ChecklistInstance(
            template_id=template_id,
            version_id=effective_version_id,
            name=instance_name,
            user_id=user.id,
            status="draft",
            progress_percentage=0,
            notes=notes,
        )
        db.add(instance)
        await db.flush()

        # -- copy items (flat, then wire parent references) ------------------
        original_items: list[ChecklistItem] = version.items
        id_map: dict[int, ChecklistItemInstance] = {}

        for item in original_items:
            item_inst = ChecklistItemInstance(
                instance_id=instance.id,
                item_id=item.id,
                title=item.title,
                description=item.description,
                order=item.order,
                is_completed=False,
                placeholder_value=None,
                parent_id=None,
                is_visible=True,
            )
            db.add(item_inst)
            id_map[item.id] = item_inst

        await db.flush()

        # Wire parent references using the id_map.
        for item in original_items:
            if item.parent_id is not None and item.parent_id in id_map:
                id_map[item.id].parent_id = id_map[item.parent_id].id

        # -- creation log ----------------------------------------------------
        log = CompletionLog(
            instance_id=instance.id,
            action="created",
            user_id=user.id,
            notes=(
                f"Created from template '{template.name}' "
                f"version {version.version_number}"
            ),
        )
        db.add(log)

        await db.flush()
        await db.refresh(instance)
        return instance

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_instances(
        db: AsyncSession,
        user: User,
    ) -> list[ChecklistInstance]:
        """Return all checklist instances owned by *user*."""
        result = await db.execute(
            select(ChecklistInstance)
            .where(ChecklistInstance.user_id == user.id)
            .order_by(ChecklistInstance.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_instance(
        db: AsyncSession,
        instance_id: int,
        user: User,
    ) -> ChecklistInstance:
        """Return a single checklist instance by *instance_id*.

        Raises ``NotFoundException`` when the instance does not exist or
        ``ForbiddenException`` when *user* is not the owner (and not an
        admin).
        """
        result = await db.execute(
            select(ChecklistInstance).where(ChecklistInstance.id == instance_id)
        )
        instance: ChecklistInstance | None = result.scalar_one_or_none()
        if instance is None:
            raise NotFoundException(f"Instance {instance_id} not found")
        if instance.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to access this instance")
        return instance

    # ------------------------------------------------------------------
    # Status transitions
    # ------------------------------------------------------------------

    @staticmethod
    async def _transition_status(
        db: AsyncSession,
        instance_id: int,
        user: User,
        target_status: str,
    ) -> ChecklistInstance:
        """Internal helper: validate and apply a status transition.

        Validates the transition against ``_STATUS_TRANSITIONS``, updates
        timestamps, writes a ``CompletionLog``, and returns the refreshed
        instance.
        """
        instance = await ChecklistInstanceService.get_instance(db, instance_id, user)

        allowed_from = _STATUS_TRANSITIONS.get(target_status)
        if allowed_from is None:
            raise BadRequestException(f"Unknown target status: {target_status}")

        if instance.status not in allowed_from:
            raise BadRequestException(
                f"Cannot transition instance from '{instance.status}' "
                f"to '{target_status}'"
            )

        now = datetime.now(timezone.utc)
        instance.status = target_status

        if target_status == "in_progress" and instance.started_at is None:
            instance.started_at = now
        elif target_status == "completed":
            instance.completed_at = now
            instance.progress_percentage = 100

        await db.flush()

        log = CompletionLog(
            instance_id=instance.id,
            action=_TRANSITION_LABELS.get(target_status, target_status),
            user_id=user.id,
        )
        db.add(log)
        await db.flush()
        await db.refresh(instance)
        return instance

    @staticmethod
    async def start_instance(
        db: AsyncSession,
        instance_id: int,
        user: User,
    ) -> ChecklistInstance:
        """Transition instance to ``in_progress``."""
        return await ChecklistInstanceService._transition_status(
            db, instance_id, user, "in_progress",
        )

    @staticmethod
    async def pause_instance(
        db: AsyncSession,
        instance_id: int,
        user: User,
    ) -> ChecklistInstance:
        """Transition instance to ``paused``."""
        return await ChecklistInstanceService._transition_status(
            db, instance_id, user, "paused",
        )

    @staticmethod
    async def resume_instance(
        db: AsyncSession,
        instance_id: int,
        user: User,
    ) -> ChecklistInstance:
        """Transition instance back to ``in_progress`` from ``paused``."""
        return await ChecklistInstanceService._transition_status(
            db, instance_id, user, "in_progress",
        )

    @staticmethod
    async def complete_instance(
        db: AsyncSession,
        instance_id: int,
        user: User,
    ) -> ChecklistInstance:
        """Transition instance to ``completed``."""
        return await ChecklistInstanceService._transition_status(
            db, instance_id, user, "completed",
        )

    @staticmethod
    async def cancel_instance(
        db: AsyncSession,
        instance_id: int,
        user: User,
    ) -> ChecklistInstance:
        """Transition instance to ``cancelled``."""
        return await ChecklistInstanceService._transition_status(
            db, instance_id, user, "cancelled",
        )

    # ------------------------------------------------------------------
    # Item toggle & progress
    # ------------------------------------------------------------------

    @staticmethod
    async def toggle_item(
        db: AsyncSession,
        item_id: int,
        user: User,
    ) -> ChecklistItemInstance:
        """Toggle the completion state of a single item instance.

        Updates ``is_completed`` and ``completed_at``, writes a
        ``CompletionLog``, then recalculates the parent instance progress.

        Returns the toggled ``ChecklistItemInstance``.
        """
        result = await db.execute(
            select(ChecklistItemInstance).where(
                ChecklistItemInstance.id == item_id,
            )
        )
        item_inst: ChecklistItemInstance | None = result.scalar_one_or_none()
        if item_inst is None:
            raise NotFoundException(f"Item instance {item_id} not found")

        # Ownership check via the parent instance.
        inst_result = await db.execute(
            select(ChecklistInstance).where(
                ChecklistInstance.id == item_inst.instance_id,
            )
        )
        instance: ChecklistInstance | None = inst_result.scalar_one_or_none()
        if instance is None:
            raise NotFoundException("Parent instance not found")
        if instance.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to modify this item")

        # Items may only be toggled while the instance is in progress.
        if instance.status != "in_progress":
            raise BadRequestException(
                "Items can only be toggled when the instance is in progress"
            )

        now = datetime.now(timezone.utc)
        new_state = not item_inst.is_completed
        item_inst.is_completed = new_state
        item_inst.completed_at = now if new_state else None

        await db.flush()

        log = CompletionLog(
            instance_id=instance.id,
            item_instance_id=item_inst.id,
            action="item_checked" if new_state else "item_unchecked",
            user_id=user.id,
        )
        db.add(log)
        await db.flush()

        # Recalculate parent instance progress.
        await ChecklistInstanceService.update_progress(db, instance)

        await db.refresh(item_inst)
        return item_inst

    @staticmethod
    async def update_progress(
        db: AsyncSession,
        instance: ChecklistInstance,
    ) -> ChecklistInstance:
        """Recalculate and persist ``progress_percentage`` for *instance*.

        Progress is computed as the ratio of completed top-level items
        (``parent_id IS NULL``) to the total number of top-level items,
        expressed as an integer percentage (0-100).  Only visible items
        participate in the calculation.

        Returns the updated instance.
        """
        total_result = await db.execute(
            select(func.count())
            .select_from(ChecklistItemInstance)
            .where(
                ChecklistItemInstance.instance_id == instance.id,
                ChecklistItemInstance.parent_id.is_(None),
                ChecklistItemInstance.is_visible.is_(True),
            )
        )
        total: int = total_result.scalar() or 0

        if total == 0:
            instance.progress_percentage = 0
        else:
            completed_result = await db.execute(
                select(func.count())
                .select_from(ChecklistItemInstance)
                .where(
                    ChecklistItemInstance.instance_id == instance.id,
                    ChecklistItemInstance.parent_id.is_(None),
                    ChecklistItemInstance.is_visible.is_(True),
                    ChecklistItemInstance.is_completed.is_(True),
                )
            )
            completed: int = completed_result.scalar() or 0
            instance.progress_percentage = int((completed / total) * 100)

        await db.flush()
        await db.refresh(instance)
        return instance
