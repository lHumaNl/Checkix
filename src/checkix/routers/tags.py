"""Router module: tags."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import NotFoundException
from checkix.models.tag import Tag
from checkix.models.user import User
from checkix.schemas.common import MessageResponse
from checkix.schemas.tag import TagCreate, TagOut, TagUpdate

router = APIRouter(tags=["tags"])


@router.get("/", response_model=None)
async def list_tags(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of tags for the current user."""
    query = (
        select(Tag)
        .where(Tag.user_id == current_user.id)
        .order_by(Tag.name)
    )
    return await paginate(db, query, pagination)


@router.post("/", response_model=TagOut, status_code=201)
async def create_tag(
    body: TagCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Tag:
    """Create a new tag for the current user."""
    tag = Tag(
        name=body.name,
        color=body.color or "#3498db",
        description=body.description,
        user_id=current_user.id,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.get("/{tag_id}/", response_model=TagOut)
async def get_tag(
    tag_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Tag:
    """Return a single tag owned by the current user."""
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundException(detail="Tag not found")
    return tag


@router.put("/{tag_id}/", response_model=TagOut)
async def update_tag(
    tag_id: int,
    body: TagUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Tag:
    """Update an existing tag owned by the current user."""
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundException(detail="Tag not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)

    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}/", response_model=MessageResponse)
async def delete_tag(
    tag_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete a tag owned by the current user."""
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == current_user.id)
    )
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundException(detail="Tag not found")

    await db.delete(tag)
    await db.commit()
    return MessageResponse(message="Tag deleted")
