"""Router module: checklist templates, versions, and items."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import BadRequestException, NotFoundException
from checkix.models.checklist import (
    ChecklistItem,
    ChecklistTemplate,
    ChecklistVersion,
    Placeholder,
    PlaceholderOption,
)
from checkix.models.tag import Tag
from checkix.models.user import User
from checkix.schemas.checklist import (
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistTemplateCreate,
    ChecklistTemplateListOut,
    ChecklistTemplateOut,
    ChecklistTemplateUpdate,
    ChecklistVersionCreate,
    ChecklistVersionOut,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["checklists"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_template_or_404(
    db: AsyncSession,
    template_id: int,
    user_id: int,
    *,
    allow_deleted: bool = False,
) -> ChecklistTemplate:
    """Fetch a template owned by *user_id* or raise 404."""
    stmt = select(ChecklistTemplate).where(
        ChecklistTemplate.id == template_id,
        ChecklistTemplate.user_id == user_id,
    )
    if not allow_deleted:
        stmt = stmt.where(ChecklistTemplate.is_deleted.is_(False))

    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundException(detail="Checklist template not found")
    return template


async def _get_version_or_404(
    db: AsyncSession,
    template_id: int,
    version_id: int,
) -> ChecklistVersion:
    """Fetch a version belonging to *template_id* or raise 404."""
    result = await db.execute(
        select(ChecklistVersion).where(
            ChecklistVersion.id == version_id,
            ChecklistVersion.template_id == template_id,
        )
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise NotFoundException(detail="Checklist version not found")
    return version


async def _set_tags(
    db: AsyncSession,
    template: ChecklistTemplate,
    tag_ids: list[int],
    user_id: int,
) -> None:
    """Replace the template's tags with those identified by *tag_ids*."""
    result = await db.execute(
        select(Tag).where(Tag.id.in_(tag_ids), Tag.user_id == user_id)
    )
    found = list(result.scalars().all())
    if len(found) != len(tag_ids):
        raise BadRequestException(detail="One or more tag IDs are invalid")
    template.tags = found


async def _load_checklist_item_tree(
    db: AsyncSession,
    version_id: int,
) -> list[ChecklistItemOut]:
    """Load all items for a version and return a fully materialized tree."""
    result = await db.execute(
        select(ChecklistItem)
        .where(ChecklistItem.version_id == version_id)
        .order_by(ChecklistItem.parent_id, ChecklistItem.order, ChecklistItem.id)
    )
    items = list(result.scalars().all())

    children_by_parent: dict[int | None, list[ChecklistItem]] = {}
    for item in items:
        children_by_parent.setdefault(item.parent_id, []).append(item)

    def build_subtree(item: ChecklistItem) -> ChecklistItemOut:
        return ChecklistItemOut(
            id=item.id,
            title=item.title,
            description=item.description,
            order=item.order,
            is_required=item.is_required,
            priority=item.priority,
            is_halt=item.is_halt,
            halt_message=item.halt_message,
            children=[build_subtree(child) for child in children_by_parent.get(item.id, [])],
        )

    return [build_subtree(item) for item in children_by_parent.get(None, [])]


async def _load_checklist_item_subtree(
    db: AsyncSession,
    version_id: int,
    item_id: int,
) -> ChecklistItemOut:
    """Return one item subtree from a fully materialized version tree."""
    stack = await _load_checklist_item_tree(db, version_id)
    while stack:
        item = stack.pop()
        if item.id == item_id:
            return item
        stack.extend(item.children)
    raise NotFoundException(detail="Checklist item not found")


# ---------------------------------------------------------------------------
# Template CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=None)
async def list_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    status: Annotated[Optional[str], Query()] = None,
    folder_id: Annotated[Optional[int], Query()] = None,
    search: Annotated[Optional[str], Query()] = None,
) -> dict:
    """Return a paginated list of checklist templates for the current user.

    Non-deleted templates only. Optional filters: ``status``, ``folder_id``.
    """
    query = (
        select(ChecklistTemplate)
        .where(
            ChecklistTemplate.user_id == current_user.id,
            ChecklistTemplate.is_deleted.is_(False),
        )
        .order_by(ChecklistTemplate.created_at.desc())
    )
    if status is not None:
        query = query.where(ChecklistTemplate.status == status)
    if folder_id is not None:
        query = query.where(ChecklistTemplate.folder_id == folder_id)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                ChecklistTemplate.name.ilike(pattern),
                ChecklistTemplate.description.ilike(pattern),
            )
        )

    return await paginate(db, query, pagination)


@router.post("/", response_model=ChecklistTemplateOut, status_code=201)
async def create_template(
    body: ChecklistTemplateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistTemplate:
    """Create a new checklist template."""
    template = ChecklistTemplate(
        name=body.name,
        description=body.description,
        folder_id=body.folder_id,
        sequential_mode=body.sequential_mode,
        icon=body.icon,
        status=body.status or "draft",
        category=body.category,
        user_id=current_user.id,
    )
    db.add(template)
    await db.flush()

    # Create the initial version (version_number=1)
    version = ChecklistVersion(
        template_id=template.id,
        version_number=1,
        changelog="Initial version",
        is_active=True,
    )
    db.add(version)
    await db.flush()

    template.current_version_id = version.id

    if body.items:
        for index, item in enumerate(body.items):
            db.add(
                ChecklistItem(
                    version_id=version.id,
                    title=item.resolved_title,
                    description=item.description,
                    order=item.order if item.order is not None else index,
                    is_required=item.is_required,
                    priority=item.priority,
                    is_halt=item.is_halt,
                    halt_message=item.halt_message,
                )
            )

    if body.tags:
        await _set_tags(db, template, body.tags, current_user.id)

    await db.commit()
    await db.refresh(template)
    return template


@router.get("/{template_id}/", response_model=ChecklistTemplateOut)
async def get_template(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistTemplate:
    """Return the detail of a single checklist template."""
    return await _get_template_or_404(db, template_id, current_user.id)


@router.put("/{template_id}/", response_model=ChecklistTemplateOut)
async def update_template(
    template_id: int,
    body: ChecklistTemplateUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistTemplate:
    """Update an existing checklist template."""
    template = await _get_template_or_404(db, template_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tags", None)

    for field, value in update_data.items():
        setattr(template, field, value)

    if tag_ids is not None:
        await _set_tags(db, template, tag_ids, current_user.id)

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}/", response_model=MessageResponse)
async def delete_template(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Soft-delete a checklist template (set ``is_deleted=True``)."""
    template = await _get_template_or_404(db, template_id, current_user.id)

    if template.is_deleted:
        raise BadRequestException(detail="Template is already deleted")

    template.is_deleted = True
    template.deleted_at = datetime.now()
    await db.commit()
    return MessageResponse(message="Template deleted")


@router.post("/{template_id}/restore/", response_model=ChecklistTemplateOut)
async def restore_template(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistTemplate:
    """Restore a previously soft-deleted checklist template."""
    template = await _get_template_or_404(
        db, template_id, current_user.id, allow_deleted=True
    )

    if not template.is_deleted:
        raise BadRequestException(detail="Template is not deleted")

    template.is_deleted = False
    template.deleted_at = None
    await db.commit()
    await db.refresh(template)
    return template


@router.post("/{template_id}/duplicate/", response_model=ChecklistTemplateOut, status_code=201)
async def duplicate_template(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistTemplate:
    """Deep-copy a checklist template including its current version and items."""
    original = await _get_template_or_404(db, template_id, current_user.id)

    # -- copy template row --------------------------------------------------
    new_template = ChecklistTemplate(
        name=f"{original.name} (copy)",
        description=original.description,
        user_id=current_user.id,
        folder_id=original.folder_id,
        sequential_mode=original.sequential_mode,
        icon=original.icon,
        is_favorite=False,
        status="draft",
        category=original.category,
        estimated_duration_seconds=original.estimated_duration_seconds,
    )
    db.add(new_template)
    await db.flush()

    # -- copy tags ----------------------------------------------------------
    new_template.tags = list(original.tags)

    # -- copy versions ------------------------------------------------------
    for original_version in original.versions:
        new_version = ChecklistVersion(
            template_id=new_template.id,
            version_number=original_version.version_number,
            changelog=original_version.changelog,
            is_active=original_version.is_active,
        )
        db.add(new_version)
        await db.flush()

        # Set current_version_id to the first (or only active) copied version
        if (
            new_template.current_version_id is None
            or original_version.id == original.current_version_id
        ):
            new_template.current_version_id = new_version.id

        # -- copy placeholders ----------------------------------------------
        placeholder_map: dict[int, int] = {}  # old id -> new id
        for ph in original_version.placeholders:
            new_ph = Placeholder(
                version_id=new_version.id,
                name=ph.name,
                placeholder_type=ph.placeholder_type,
                is_required=ph.is_required,
                default_value=ph.default_value,
            )
            db.add(new_ph)
            await db.flush()
            placeholder_map[ph.id] = new_ph.id

            for opt in ph.options:
                new_opt = PlaceholderOption(
                    placeholder_id=new_ph.id,
                    value=opt.value,
                    display_text=opt.display_text,
                    order=opt.order,
                )
                db.add(new_opt)

        # -- copy items -----------------------------------------------------
        item_map: dict[int, int] = {}  # old id -> new id
        for item in original_version.items:
            new_item = ChecklistItem(
                version_id=new_version.id,
                parent_id=item_map.get(item.parent_id) if item.parent_id else None,
                title=item.title,
                description=item.description,
                order=item.order,
                is_required=item.is_required,
                priority=item.priority,
                placeholder_id=placeholder_map.get(item.placeholder_id),
                is_halt=item.is_halt,
                halt_message=item.halt_message,
            )
            db.add(new_item)
            await db.flush()
            item_map[item.id] = new_item.id

    await db.commit()
    await db.refresh(new_template)
    return new_template


@router.post("/{template_id}/toggle_favorite/", response_model=ChecklistTemplateOut)
async def toggle_favorite(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistTemplate:
    """Toggle the ``is_favorite`` flag on a checklist template."""
    template = await _get_template_or_404(db, template_id, current_user.id)
    template.is_favorite = not template.is_favorite
    await db.commit()
    await db.refresh(template)
    return template


# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------


@router.get("/{template_id}/versions/", response_model=list[ChecklistVersionOut])
async def list_versions(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChecklistVersion]:
    """Return all versions of a checklist template."""
    await _get_template_or_404(db, template_id, current_user.id)

    result = await db.execute(
        select(ChecklistVersion)
        .where(ChecklistVersion.template_id == template_id)
        .order_by(ChecklistVersion.version_number)
    )
    return list(result.scalars().all())


@router.post("/{template_id}/versions/", response_model=ChecklistVersionOut, status_code=201)
async def create_version(
    template_id: int,
    body: ChecklistVersionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistVersion:
    """Create a new version for a checklist template.

    The ``version_number`` is auto-incremented based on the current maximum.
    Previously active versions are set to ``is_active=False``.
    """
    template = await _get_template_or_404(db, template_id, current_user.id)

    # Determine the next version number
    result = await db.execute(
        select(func.coalesce(func.max(ChecklistVersion.version_number), 0)).where(
            ChecklistVersion.template_id == template_id
        )
    )
    max_version = result.scalar_one()
    next_version = max_version + 1

    # Deactivate all existing active versions
    active_result = await db.execute(
        select(ChecklistVersion).where(
            ChecklistVersion.template_id == template_id,
            ChecklistVersion.is_active.is_(True),
        )
    )
    for old_version in active_result.scalars().all():
        old_version.is_active = False

    version = ChecklistVersion(
        template_id=template_id,
        version_number=next_version,
        changelog=body.changelog,
        is_active=True,
    )
    db.add(version)
    await db.flush()

    template.current_version_id = version.id
    await db.commit()
    await db.refresh(version)
    return version


# ---------------------------------------------------------------------------
# Items (within a version)
# ---------------------------------------------------------------------------


@router.get(
    "/{template_id}/versions/{version_id}/items/",
    response_model=list[ChecklistItemOut],
)
async def list_items(
    template_id: int,
    version_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChecklistItemOut]:
    """Return all items for a specific checklist version.

    Only root-level items (``parent_id is None``) are returned; children are
    included via the nested ``children`` relationship.
    """
    await _get_template_or_404(db, template_id, current_user.id)
    await _get_version_or_404(db, template_id, version_id)

    return await _load_checklist_item_tree(db, version_id)


@router.post(
    "/{template_id}/versions/{version_id}/items/",
    response_model=ChecklistItemOut,
    status_code=201,
)
async def create_item(
    template_id: int,
    version_id: int,
    body: ChecklistItemCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ChecklistItemOut:
    """Create a new item (and optionally nested children) in a version."""
    await _get_template_or_404(db, template_id, current_user.id)
    await _get_version_or_404(db, template_id, version_id)

    item = ChecklistItem(
        version_id=version_id,
        title=body.title,
        description=body.description,
        order=body.order,
        is_required=body.is_required,
        priority=body.priority,
        is_halt=body.is_halt,
        halt_message=body.halt_message,
    )
    db.add(item)
    await db.flush()

    # Recursively create children if provided
    async def _create_children(
        parent_id: int,
        children_data: list[ChecklistItemCreate],
    ) -> None:
        for idx, child_data in enumerate(children_data):
            child = ChecklistItem(
                version_id=version_id,
                parent_id=parent_id,
                title=child_data.title,
                description=child_data.description,
                order=child_data.order or idx,
                is_required=child_data.is_required,
                priority=child_data.priority,
                is_halt=child_data.is_halt,
                halt_message=child_data.halt_message,
            )
            db.add(child)
            await db.flush()
            if child_data.children:
                await _create_children(child.id, child_data.children)

    if body.children:
        await _create_children(item.id, body.children)

    await db.commit()
    return await _load_checklist_item_subtree(db, version_id, item.id)
