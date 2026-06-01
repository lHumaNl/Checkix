"""Service layer for run-link CRUD and checklist instance execution via shareable links."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Sequence

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import (
    BadRequestException,
    ForbiddenException,
    GoneException,
    NotFoundException,
)
from checkix.models.checklist import ChecklistTemplate
from checkix.models.run_link import RunLink
from checkix.models.user import User

# Lazy import to avoid circular dependency -- the instance service lives in
# a separate module and is only needed inside ``execute_run_link``.
from checkix.services.checklist_instance import ChecklistInstanceService


class RunLinkService:
    """Async service for shareable run-link lifecycle and execution."""

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    async def create_run_link(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> RunLink:
        """Create a new run link for a checklist template.

        Generates a unique ID (UUID4) for the link and persists it.
        Returns the created ``RunLink``.
        """
        template_id = (
            getattr(data, "checklist_template_id", None)
            or getattr(data, "template_id", None)
        )
        if template_id is None:
            raise BadRequestException("template_id is required")

        # Verify the template exists and belongs to the user
        tmpl_result = await db.execute(
            select(ChecklistTemplate).where(
                and_(
                    ChecklistTemplate.id == template_id,
                    ChecklistTemplate.is_deleted.is_(False),
                )
            )
        )
        template = tmpl_result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(f"Template {template_id} not found")
        if template.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to create run links for this template")

        run_link = RunLink(
            checklist_template_id=template_id,
            unique_id=str(uuid.uuid4()),
            name=getattr(data, "name", None) or template.name,
            access_type=getattr(data, "access_type", "public"),
            preset_values=getattr(data, "preset_values", {}) or {},
            expires_at=getattr(data, "expires_at", None),
            max_uses=getattr(data, "max_uses", None),
            usage_count=0,
            created_by_id=user.id,
        )
        db.add(run_link)
        await db.flush()
        await db.refresh(run_link)
        return run_link

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_run_links(
        db: AsyncSession,
        user: User,
        template_id: int | None = None,
    ) -> Sequence[RunLink]:
        """Return run links created by *user*, optionally filtered by template."""
        stmt = (
            select(RunLink)
            .where(RunLink.created_by_id == user.id)
            .order_by(RunLink.created_at.desc())
        )
        if template_id is not None:
            stmt = stmt.where(RunLink.checklist_template_id == template_id)

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_run_link(
        db: AsyncSession,
        run_link_id: int,
        user: User,
    ) -> RunLink:
        """Fetch a single run link by *run_link_id*, verifying ownership."""
        result = await db.execute(
            select(RunLink).where(RunLink.id == run_link_id),
        )
        link: RunLink | None = result.scalar_one_or_none()
        if link is None:
            raise NotFoundException(f"Run link {run_link_id} not found")
        if link.created_by_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to access this run link")
        return link

    @staticmethod
    async def get_run_link_by_unique_id(
        db: AsyncSession,
        unique_id: str,
    ) -> RunLink:
        """Fetch a run link by its public ``unique_id``.

        Raises ``NotFoundException`` if the link does not exist.
        """
        result = await db.execute(
            select(RunLink).where(RunLink.unique_id == unique_id),
        )
        link: RunLink | None = result.scalar_one_or_none()
        if link is None:
            raise NotFoundException(f"Run link {unique_id} not found")
        return link

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    @staticmethod
    async def delete_run_link(
        db: AsyncSession,
        run_link_id: int,
        user: User,
    ) -> None:
        """Delete a run link after verifying ownership."""
        link = await RunLinkService.get_run_link(db, run_link_id, user)
        await db.delete(link)
        await db.flush()

    # ------------------------------------------------------------------
    # Execute
    # ------------------------------------------------------------------

    @staticmethod
    async def execute_run_link(
        db: AsyncSession,
        unique_id: str,
        user: User,
        preset_overrides: dict | None = None,
    ) -> Any:
        """Execute a run link: validate it and create a checklist instance.

        Performs the following checks:
        1. Link must exist.
        2. Link must not be expired (``expires_at`` in the future or ``None``).
        3. Link must not have exceeded ``max_uses``.
        4. Template must still exist and not be soft-deleted.

        On success, increments ``usage_count`` and delegates to
        ``ChecklistInstanceService.create_from_template``.

        Returns the newly created ``ChecklistInstance``.
        """
        link = await RunLinkService.get_run_link_by_unique_id(db, unique_id)

        now = datetime.now(timezone.utc)

        # Validate expiration
        if link.expires_at is not None and link.expires_at < now:
            raise GoneException("This run link has expired")

        # Validate usage limit
        if link.max_uses is not None and link.usage_count >= link.max_uses:
            raise GoneException("This run link has reached its maximum usage limit")

        # Validate template still exists
        tmpl_result = await db.execute(
            select(ChecklistTemplate).where(
                and_(
                    ChecklistTemplate.id == link.checklist_template_id,
                    ChecklistTemplate.is_deleted.is_(False),
                )
            )
        )
        template = tmpl_result.scalar_one_or_none()
        if template is None:
            raise GoneException("The template for this run link no longer exists")

        # Merge preset values with overrides
        merged_presets = {**link.preset_values}
        if preset_overrides:
            merged_presets.update(preset_overrides)

        # Create the instance
        instance = await ChecklistInstanceService.create_from_template(
            db,
            user=user,
            template_id=link.checklist_template_id,
            name=None,
            notes=f"Created via run link {link.unique_id}",
        )

        # Increment usage counter
        link.usage_count += 1
        await db.flush()

        return instance
