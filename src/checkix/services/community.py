"""Service layer for community template publishing, approval, ratings, and downloads."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Sequence

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from checkix.models.community import CommunityTemplate, TemplateRating
from checkix.models.user import User


class CommunityService:
    """Async service for community template lifecycle operations."""

    # ------------------------------------------------------------------
    # Publish
    # ------------------------------------------------------------------

    @staticmethod
    async def publish_template(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> CommunityTemplate:
        """Publish a checklist template to the community library.

        Creates a ``CommunityTemplate`` with ``status="pending"`` awaiting
        admin approval.

        Returns the persisted ``CommunityTemplate``.
        """
        checklist_template_id = (
            getattr(data, "checklist_template_id", None)
            or getattr(data, "template_id", None)
        )
        if checklist_template_id is None:
            raise BadRequestException("checklist_template_id is required")

        # Check if already published
        existing = await db.execute(
            select(CommunityTemplate).where(
                CommunityTemplate.checklist_template_id == checklist_template_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise BadRequestException("Template is already published to the community")

        community_template = CommunityTemplate(
            checklist_template_id=checklist_template_id,
            author_id=user.id,
            name=data.name,
            description=getattr(data, "description", None),
            category=getattr(data, "category", None),
            status="pending",
            tags=getattr(data, "tags", []) or [],
            download_count=0,
            rating=None,
            rating_count=0,
            is_featured=False,
            published_at=datetime.now(timezone.utc),
            approved_by_id=None,
        )
        db.add(community_template)
        await db.flush()
        await db.refresh(community_template)
        return community_template

    # ------------------------------------------------------------------
    # Approve
    # ------------------------------------------------------------------

    @staticmethod
    async def approve_template(
        db: AsyncSession,
        community_template_id: int,
        admin: User,
    ) -> CommunityTemplate:
        """Approve a pending community template (admin only).

        Sets ``status`` to ``"approved"`` and records the approving admin.
        """
        if not admin.is_admin:
            raise ForbiddenException("Only admins can approve community templates")

        result = await db.execute(
            select(CommunityTemplate).where(
                CommunityTemplate.id == community_template_id,
            )
        )
        template: CommunityTemplate | None = result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(
                f"Community template {community_template_id} not found"
            )

        if template.status != "pending":
            raise BadRequestException(
                f"Cannot approve template with status '{template.status}'"
            )

        template.status = "approved"
        template.approved_by_id = admin.id
        await db.flush()
        await db.refresh(template)
        return template

    # ------------------------------------------------------------------
    # Reject
    # ------------------------------------------------------------------

    @staticmethod
    async def reject_template(
        db: AsyncSession,
        community_template_id: int,
        admin: User,
    ) -> CommunityTemplate:
        """Reject a pending community template (admin only).

        Sets ``status`` to ``"rejected"``.
        """
        if not admin.is_admin:
            raise ForbiddenException("Only admins can reject community templates")

        result = await db.execute(
            select(CommunityTemplate).where(
                CommunityTemplate.id == community_template_id,
            )
        )
        template: CommunityTemplate | None = result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(
                f"Community template {community_template_id} not found"
            )

        if template.status != "pending":
            raise BadRequestException(
                f"Cannot reject template with status '{template.status}'"
            )

        template.status = "rejected"
        await db.flush()
        await db.refresh(template)
        return template

    # ------------------------------------------------------------------
    # Rate
    # ------------------------------------------------------------------

    @staticmethod
    async def rate_template(
        db: AsyncSession,
        user: User,
        community_template_id: int,
        score: int,
        comment: str | None = None,
    ) -> TemplateRating:
        """Submit or update a rating for a community template.

        A user may only rate a given template once; a second call updates
        the existing row.  After persisting the rating, the average rating
        on the ``CommunityTemplate`` is recalculated.

        Returns the persisted ``TemplateRating``.
        """
        if not (1 <= score <= 5):
            raise BadRequestException("Rating score must be between 1 and 5")

        # Verify the community template exists and is approved
        tmpl_result = await db.execute(
            select(CommunityTemplate).where(
                CommunityTemplate.id == community_template_id,
            )
        )
        template: CommunityTemplate | None = tmpl_result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(
                f"Community template {community_template_id} not found"
            )

        # Upsert the rating
        existing_result = await db.execute(
            select(TemplateRating).where(
                and_(
                    TemplateRating.community_template_id == community_template_id,
                    TemplateRating.user_id == user.id,
                )
            )
        )
        rating: TemplateRating | None = existing_result.scalar_one_or_none()

        if rating is None:
            rating = TemplateRating(
                community_template_id=community_template_id,
                user_id=user.id,
                rating=score,
                comment=comment,
            )
            db.add(rating)
        else:
            rating.rating = score
            rating.comment = comment

        await db.flush()

        # Recalculate average rating on the template
        avg_result = await db.execute(
            select(func.avg(TemplateRating.rating), func.count(TemplateRating.id))
            .where(TemplateRating.community_template_id == community_template_id)
        )
        row = avg_result.one()
        template.rating = float(row[0]) if row[0] is not None else None
        template.rating_count = row[1]

        await db.flush()
        await db.refresh(rating)
        return rating

    # ------------------------------------------------------------------
    # Download
    # ------------------------------------------------------------------

    @staticmethod
    async def download_template(
        db: AsyncSession,
        community_template_id: int,
    ) -> CommunityTemplate:
        """Increment the download count for a community template.

        Returns the updated ``CommunityTemplate``.
        """
        result = await db.execute(
            select(CommunityTemplate).where(
                CommunityTemplate.id == community_template_id,
            )
        )
        template: CommunityTemplate | None = result.scalar_one_or_none()
        if template is None:
            raise NotFoundException(
                f"Community template {community_template_id} not found"
            )
        if template.status != "approved":
            raise BadRequestException("Template is not available for download")

        template.download_count += 1
        await db.flush()
        await db.refresh(template)
        return template

    # ------------------------------------------------------------------
    # List approved
    # ------------------------------------------------------------------

    @staticmethod
    async def get_approved_templates(
        db: AsyncSession,
        *,
        category: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[CommunityTemplate]:
        """Return approved community templates with optional filters.

        Results are ordered by download count descending.
        """
        stmt = (
            select(CommunityTemplate)
            .where(CommunityTemplate.status == "approved")
            .order_by(CommunityTemplate.download_count.desc())
            .limit(limit)
            .offset(offset)
        )

        if category is not None:
            stmt = stmt.where(CommunityTemplate.category == category)
        if search:
            stmt = stmt.where(CommunityTemplate.name.ilike(f"%{search}%"))

        result = await db.execute(stmt)
        return result.scalars().all()

    # ------------------------------------------------------------------
    # Featured
    # ------------------------------------------------------------------

    @staticmethod
    async def get_featured(
        db: AsyncSession,
        *,
        limit: int = 10,
    ) -> Sequence[CommunityTemplate]:
        """Return featured community templates.

        Results are ordered by rating descending.
        """
        stmt = (
            select(CommunityTemplate)
            .where(
                and_(
                    CommunityTemplate.status == "approved",
                    CommunityTemplate.is_featured.is_(True),
                )
            )
            .order_by(CommunityTemplate.rating.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
