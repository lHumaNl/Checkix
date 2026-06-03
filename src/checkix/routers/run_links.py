"""Router module: run_links."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import MANAGE_RUN_LINKS_PERMISSION, PaginationParams, paginate_mapped, require_permission
from checkix.exceptions import NotFoundException
from checkix.models.checklist import ChecklistTemplate
from checkix.models.run_link import RunLink
from checkix.models.user import User
from checkix.schemas.run_link import RunLinkCreate, RunLinkOut
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["run-links"])

ACCESS_TYPE_DISPLAY = {"public": "Public", "restricted": "Restricted"}


def _utc_datetime(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _is_expired(link: RunLink) -> bool:
    return link.expires_at is not None and _utc_datetime(link.expires_at) < datetime.now(timezone.utc)


def _run_link_data(link: RunLink, template_name: str | None, created_by_email: str | None) -> dict:
    is_expired = _is_expired(link)
    is_max_uses_reached = link.max_uses is not None and link.usage_count >= link.max_uses
    return {
        "id": link.id,
        "template_id": link.checklist_template_id,
        "checklist_template_name": template_name or "",
        "unique_id": link.unique_id,
        "token": link.unique_id,
        "name": link.name,
        "access_type": link.access_type,
        "access_type_display": ACCESS_TYPE_DISPLAY.get(link.access_type, link.access_type.title()),
        "max_uses": link.max_uses,
        "usage_count": link.usage_count,
        "use_count": link.usage_count,
        "expires_at": link.expires_at,
        "is_expired": is_expired,
        "is_max_uses_reached": is_max_uses_reached,
        "is_valid": not is_expired and not is_max_uses_reached,
        "created_by": link.created_by_id,
        "created_by_email": created_by_email or "",
        "created_at": link.created_at,
        "updated_at": link.updated_at,
    }


def _run_link_row(row) -> dict:
    return _run_link_data(row[0], row.checklist_template_name, row.created_by_email)


async def _get_link_or_404(
    db: AsyncSession,
    link_id: int,
    user_id: int,
) -> RunLink:
    """Fetch a run link created by *user_id* or raise 404."""
    result = await db.execute(
        select(RunLink).where(
            RunLink.id == link_id,
            RunLink.created_by_id == user_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise NotFoundException(detail="Run link not found")
    return link


async def _get_owned_template_or_404(
    db: AsyncSession,
    template_id: int,
    user_id: int,
) -> ChecklistTemplate:
    """Fetch a non-deleted template owned by *user_id* or raise 404."""
    result = await db.execute(
        select(ChecklistTemplate).where(
            ChecklistTemplate.id == template_id,
            ChecklistTemplate.user_id == user_id,
            ChecklistTemplate.is_deleted.is_(False),
        )
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundException(detail="Checklist template not found")
    return template


@router.get("/", response_model=None)
async def list_run_links(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_RUN_LINKS_PERMISSION))],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of run links for the current user."""
    query = (
        select(
            RunLink,
            ChecklistTemplate.name.label("checklist_template_name"),
            User.email.label("created_by_email"),
        )
        .outerjoin(ChecklistTemplate, ChecklistTemplate.id == RunLink.checklist_template_id)
        .outerjoin(User, User.id == RunLink.created_by_id)
        .where(RunLink.created_by_id == current_user.id)
        .order_by(RunLink.created_at.desc())
    )
    return await paginate_mapped(db, query, pagination, _run_link_row)


@router.post("/", response_model=RunLinkOut, status_code=201)
async def create_run_link(
    body: RunLinkCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_RUN_LINKS_PERMISSION))],
) -> dict:
    """Create a new run link."""
    import uuid

    template = await _get_owned_template_or_404(db, body.template_id, current_user.id)

    link = RunLink(
        checklist_template_id=body.template_id,
        unique_id=str(uuid.uuid4()),
        name=body.name or "Run Link",
        access_type=body.access_type,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
        created_by_id=current_user.id,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return _run_link_data(link, template.name, current_user.email)


@router.delete("/{link_id}/", response_model=MessageResponse)
async def delete_run_link(
    link_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_RUN_LINKS_PERMISSION))],
) -> MessageResponse:
    """Delete a run link permanently."""
    link = await _get_link_or_404(db, link_id, current_user.id)

    await db.delete(link)
    await db.commit()
    return MessageResponse(message="Run link deleted")


# ---------------------------------------------------------------------------
# Public execution endpoints (no auth required)
# ---------------------------------------------------------------------------


@router.get("/execute/{unique_id}/", response_model=RunLinkOut)
async def get_run_link_by_unique_id(
    unique_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Return a run link by its unique public ID.

    This is a public endpoint -- no authentication required.
    """
    result = await db.execute(
        select(
            RunLink,
            ChecklistTemplate.name.label("checklist_template_name"),
            User.email.label("created_by_email"),
        )
        .outerjoin(ChecklistTemplate, ChecklistTemplate.id == RunLink.checklist_template_id)
        .outerjoin(User, User.id == RunLink.created_by_id)
        .where(RunLink.unique_id == unique_id)
    )
    row = result.one_or_none()
    if row is None:
        raise NotFoundException(detail="Run link not found")

    return _run_link_row(row)


@router.post("/execute/{unique_id}/", response_model=MessageResponse)
async def execute_run_link(
    unique_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Execute (increment usage of) a run link by its unique public ID.

    This is a public endpoint -- no authentication required.
    Validates that the link is active, not expired, and within usage limits.
    """
    result = await db.execute(
        select(RunLink).where(RunLink.unique_id == unique_id)
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise NotFoundException(detail="Run link not found")

    if not link.access_type == "public":
        raise NotFoundException(detail="Run link not found")

    if _is_expired(link):
        raise NotFoundException(detail="Run link has expired")

    if link.max_uses is not None and link.usage_count >= link.max_uses:
        raise NotFoundException(detail="Run link has reached its usage limit")

    link.usage_count += 1
    await db.commit()

    return MessageResponse(message="Run link executed successfully")
