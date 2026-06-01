"""Service layer for checklist template CRUD, versioning, and duplication."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Sequence

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from checkix.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from checkix.models.checklist import (
    ChecklistItem,
    ChecklistTemplate,
    ChecklistVersion,
    checklist_templates_tags,
)
from checkix.models.tag import Tag
from checkix.models.user import User


class ChecklistService:
    """Async service for checklist template lifecycle operations."""

    # ------------------------------------------------------------------
    # Template CRUD
    # ------------------------------------------------------------------

    @staticmethod
    async def create_template(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> ChecklistTemplate:
        """Create a new checklist template, handle tags, and seed version 1."""

        template = ChecklistTemplate(
            name=data.name,
            description=data.description,
            user_id=user.id,
            folder_id=getattr(data, "folder_id", None),
            sequential_mode=getattr(data, "sequential_mode", False),
            icon=getattr(data, "icon", None),
            status=getattr(data, "status", "draft"),
            category=getattr(data, "category", None),
            is_favorite=False,
            is_deleted=False,
        )
        db.add(template)
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
            template.tags = tag_objs

        # -- Seed the first version -----------------------------------------
        version = ChecklistVersion(
            template_id=template.id,
            version_number=1,
            changelog="Initial version",
            is_active=True,
        )
        db.add(version)
        await db.flush()

        template.current_version_id = version.id
        await db.flush()

        # Refresh with relationships loaded
        await db.refresh(template)
        return template

    @staticmethod
    async def get_templates(
        db: AsyncSession,
        user: User,
        filters: Any | None = None,
    ) -> Sequence[ChecklistTemplate]:
        """Return all non-deleted templates owned by *user*, optionally filtered."""

        stmt = (
            select(ChecklistTemplate)
            .where(
                and_(
                    ChecklistTemplate.user_id == user.id,
                    ChecklistTemplate.is_deleted.is_(False),
                )
            )
            .order_by(ChecklistTemplate.created_at.desc())
        )

        if filters is not None:
            folder_id = getattr(filters, "folder_id", None)
            if folder_id is not None:
                stmt = stmt.where(ChecklistTemplate.folder_id == folder_id)

            status = getattr(filters, "status", None)
            if status is not None:
                stmt = stmt.where(ChecklistTemplate.status == status)

            is_favorite = getattr(filters, "is_favorite", None)
            if is_favorite is not None:
                stmt = stmt.where(ChecklistTemplate.is_favorite == is_favorite)

            category = getattr(filters, "category", None)
            if category is not None:
                stmt = stmt.where(ChecklistTemplate.category == category)

            search = getattr(filters, "search", None)
            if search:
                stmt = stmt.where(
                    ChecklistTemplate.name.ilike(f"%{search}%")
                )

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_template(
        db: AsyncSession,
        template_id: int,
        user: User,
    ) -> ChecklistTemplate:
        """Fetch a single template by *id*, verifying ownership."""

        stmt = (
            select(ChecklistTemplate)
            .options(
                selectinload(ChecklistTemplate.tags),
                selectinload(ChecklistTemplate.versions),
            )
            .where(
                and_(
                    ChecklistTemplate.id == template_id,
                    ChecklistTemplate.user_id == user.id,
                )
            )
        )
        result = await db.execute(stmt)
        template = result.scalar_one_or_none()

        if template is None:
            raise NotFoundException("Template not found")
        return template

    @staticmethod
    async def update_template(
        db: AsyncSession,
        template: ChecklistTemplate,
        data: Any,
    ) -> ChecklistTemplate:
        """Apply partial updates to an existing template."""

        update_fields = [
            "name",
            "description",
            "folder_id",
            "status",
            "sequential_mode",
            "icon",
            "category",
            "is_favorite",
        ]
        for field in update_fields:
            value = getattr(data, field, None)
            if value is not None:
                setattr(template, field, value)

        # -- Handle tag replacement -----------------------------------------
        tag_names = getattr(data, "tags", None)
        if tag_names is not None:
            user_id = template.user_id
            tag_objs: list[Tag] = []
            for name in tag_names:
                stmt = select(Tag).where(and_(Tag.name == name, Tag.user_id == user_id))
                result = await db.execute(stmt)
                tag = result.scalar_one_or_none()
                if tag is None:
                    tag = Tag(name=name, user_id=user_id)
                    db.add(tag)
                    await db.flush()
                tag_objs.append(tag)
            template.tags = tag_objs

        await db.flush()
        await db.refresh(template)
        return template

    @staticmethod
    async def soft_delete_template(
        db: AsyncSession,
        template: ChecklistTemplate,
    ) -> ChecklistTemplate:
        """Mark a template as soft-deleted."""

        template.is_deleted = True
        template.deleted_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(template)
        return template

    @staticmethod
    async def restore_template(
        db: AsyncSession,
        template: ChecklistTemplate,
    ) -> ChecklistTemplate:
        """Restore a previously soft-deleted template."""

        template.is_deleted = False
        template.deleted_at = None
        await db.flush()
        await db.refresh(template)
        return template

    # ------------------------------------------------------------------
    # Versioning
    # ------------------------------------------------------------------

    @staticmethod
    async def create_version(
        db: AsyncSession,
        template: ChecklistTemplate,
        changelog: str | None = None,
    ) -> ChecklistVersion:
        """Create a new version for a template (auto-incrementing number)."""

        # Determine next version number
        stmt = select(func.max(ChecklistVersion.version_number)).where(
            ChecklistVersion.template_id == template.id
        )
        result = await db.execute(stmt)
        max_ver = result.scalar() or 0
        next_ver = max_ver + 1

        # Deactivate all previous versions
        await db.execute(
            update(ChecklistVersion)
            .where(ChecklistVersion.template_id == template.id)
            .values(is_active=False)
        )

        version = ChecklistVersion(
            template_id=template.id,
            version_number=next_ver,
            changelog=changelog,
            is_active=True,
        )
        db.add(version)
        await db.flush()

        template.current_version_id = version.id
        await db.flush()

        await db.refresh(version)
        return version

    # ------------------------------------------------------------------
    # Items
    # ------------------------------------------------------------------

    @staticmethod
    async def create_item(
        db: AsyncSession,
        version: ChecklistVersion,
        data: Any,
        parent: ChecklistItem | None = None,
    ) -> ChecklistItem:
        """Create a single checklist item, optionally under a *parent*."""

        item = ChecklistItem(
            version_id=version.id,
            parent_id=parent.id if parent else None,
            title=data.title,
            description=getattr(data, "description", None),
            order=getattr(data, "order", 0),
            is_required=getattr(data, "is_required", True),
            priority=getattr(data, "priority", None),
            is_halt=getattr(data, "is_halt", False),
            halt_message=getattr(data, "halt_message", None),
        )
        db.add(item)
        await db.flush()

        # Recursively create children if present
        children_data = getattr(data, "children", None) or []
        for child_data in children_data:
            await ChecklistService.create_item(db, version, child_data, parent=item)

        await db.refresh(item)
        return item

    # ------------------------------------------------------------------
    # Duplication
    # ------------------------------------------------------------------

    @staticmethod
    async def duplicate_template(
        db: AsyncSession,
        template: ChecklistTemplate,
        name: str,
        user: User,
    ) -> ChecklistTemplate:
        """Deep-copy a template (with items) for *user* under a new *name*."""

        # 1. Create the new template header
        new_template = ChecklistTemplate(
            name=name,
            description=template.description,
            user_id=user.id,
            folder_id=template.folder_id,
            sequential_mode=template.sequential_mode,
            icon=template.icon,
            status="draft",
            category=template.category,
            is_favorite=False,
            is_deleted=False,
        )
        db.add(new_template)
        await db.flush()

        # 2. Copy tag associations
        new_template.tags = list(template.tags)

        # 3. Copy versions and items
        for original_version in template.versions:
            new_version = ChecklistVersion(
                template_id=new_template.id,
                version_number=original_version.version_number,
                changelog=original_version.changelog,
                is_active=original_version.is_active,
            )
            db.add(new_version)
            await db.flush()

            # Copy items recursively (root items first, children follow)
            for original_item in original_version.items:
                if original_item.parent_id is None:
                    await ChecklistService._copy_item(
                        db, new_version, original_item, None,
                    )

            if original_version.id == template.current_version_id:
                new_template.current_version_id = new_version.id

        await db.flush()
        await db.refresh(new_template)
        return new_template

    @staticmethod
    async def _copy_item(
        db: AsyncSession,
        version: ChecklistVersion,
        original: ChecklistItem,
        new_parent: ChecklistItem | None,
    ) -> ChecklistItem:
        """Recursively copy a single item and its children."""

        new_item = ChecklistItem(
            version_id=version.id,
            parent_id=new_parent.id if new_parent else None,
            title=original.title,
            description=original.description,
            order=original.order,
            is_required=original.is_required,
            priority=original.priority,
            is_halt=original.is_halt,
            halt_message=original.halt_message,
        )
        db.add(new_item)
        await db.flush()

        for child in original.children:
            await ChecklistService._copy_item(db, version, child, new_item)

        return new_item
