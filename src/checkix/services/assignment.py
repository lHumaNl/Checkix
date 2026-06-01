"""Service layer for assignment CRUD operations."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import ForbiddenException, NotFoundException
from checkix.models.assignment import Assignment
from checkix.models.user import User


class AssignmentService:
    """Async service for assignment lifecycle operations."""

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    async def create_assignment(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> Assignment:
        """Create a new assignment.

        Returns the persisted ``Assignment``.
        """
        assignment = Assignment(
            user_id=user.id,
            assignment_type=getattr(data, "assignment_type", "template"),
            checklist_template_id=getattr(data, "checklist_template_id", None)
            or getattr(data, "template_id", None),
            checklist_item_id=getattr(data, "checklist_item_id", None),
            checklist_instance_id=getattr(data, "checklist_instance_id", None),
            assignee_type=getattr(data, "assignee_type", "user"),
            assignee_user_id=getattr(data, "assignee_user_id", None)
            or getattr(data, "assignee_id", None),
            assignee_group_id=getattr(data, "assignee_group_id", None),
            assignee_parameter=getattr(data, "assignee_parameter", None),
            is_exclusive=getattr(data, "is_exclusive", False),
            auto_notify=getattr(data, "auto_notify", True),
        )
        db.add(assignment)
        await db.flush()
        await db.refresh(assignment)
        return assignment

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_assignments(
        db: AsyncSession,
        user: User,
        template_id: int | None = None,
        instance_id: int | None = None,
    ) -> Sequence[Assignment]:
        """Return assignments for *user*, optionally filtered by template or instance.

        Results are ordered by ``created_at`` descending.
        """
        stmt = (
            select(Assignment)
            .where(Assignment.user_id == user.id)
            .order_by(Assignment.created_at.desc())
        )

        if template_id is not None:
            stmt = stmt.where(Assignment.checklist_template_id == template_id)
        if instance_id is not None:
            stmt = stmt.where(Assignment.checklist_instance_id == instance_id)

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_assignment(
        db: AsyncSession,
        assignment_id: int,
        user: User,
    ) -> Assignment:
        """Fetch a single assignment by *assignment_id*, verifying ownership.

        Raises ``NotFoundException`` when the assignment does not exist or
        ``ForbiddenException`` when *user* is not the owner (and not admin).
        """
        result = await db.execute(
            select(Assignment).where(Assignment.id == assignment_id),
        )
        assignment: Assignment | None = result.scalar_one_or_none()
        if assignment is None:
            raise NotFoundException(f"Assignment {assignment_id} not found")
        if assignment.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to access this assignment")
        return assignment

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    @staticmethod
    async def delete_assignment(
        db: AsyncSession,
        assignment_id: int,
        user: User,
    ) -> None:
        """Delete an assignment by *assignment_id* after verifying ownership."""
        assignment = await AssignmentService.get_assignment(db, assignment_id, user)
        await db.delete(assignment)
        await db.flush()
