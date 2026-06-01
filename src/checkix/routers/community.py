"""Router module: community."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import NotFoundException
from checkix.models.community import CommunityTemplate, TemplateRating
from checkix.models.user import User
from checkix.schemas.community import (
    CommunityTemplateCreate,
    CommunityTemplateOut,
    TemplateRatingCreate,
    TemplateRatingOut,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["community"])


async def _get_template_or_404(
    db: AsyncSession,
    template_id: int,
) -> CommunityTemplate:
    """Fetch a community template or raise 404."""
    result = await db.execute(
        select(CommunityTemplate).where(CommunityTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundException(detail="Community template not found")
    return template


# ---------------------------------------------------------------------------
# Community Templates
# ---------------------------------------------------------------------------


@router.get("/templates/", response_model=None)
async def list_community_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    pagination: Annotated[PaginationParams, Depends()],
    category: Annotated[Optional[str], Query()] = None,
) -> dict:
    """Return a paginated list of published community templates."""
    query = (
        select(CommunityTemplate)
        .where(CommunityTemplate.status == "published")
        .order_by(CommunityTemplate.created_at.desc())
    )
    if category is not None:
        query = query.where(CommunityTemplate.category == category)

    return await paginate(db, query, pagination)


@router.get("/templates/featured/", response_model=None)
async def list_featured_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of featured community templates."""
    query = (
        select(CommunityTemplate)
        .where(
            CommunityTemplate.status == "published",
            CommunityTemplate.is_featured.is_(True),
        )
        .order_by(CommunityTemplate.rating.desc())
    )
    return await paginate(db, query, pagination)


@router.get("/templates/{template_id}/", response_model=CommunityTemplateOut)
async def get_community_template(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CommunityTemplate:
    """Return the detail of a single community template."""
    return await _get_template_or_404(db, template_id)


@router.post("/templates/", response_model=CommunityTemplateOut, status_code=201)
async def publish_template(
    body: CommunityTemplateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CommunityTemplate:
    """Publish a template to the community library."""
    template = CommunityTemplate(
        name=body.name,
        description=body.description,
        category=body.category,
        tags=body.tags or [],
        author_id=current_user.id,
        status="published" if body.is_published else "pending",
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.post("/templates/{template_id}/download/", response_model=MessageResponse)
async def download_template(
    template_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Record a download of a community template and increment the counter."""
    template = await _get_template_or_404(db, template_id)

    template.download_count += 1
    await db.commit()

    return MessageResponse(
        message="Template downloaded",
        detail=f"Download recorded for '{template.name}'",
    )


@router.post("/templates/{template_id}/ratings/", response_model=TemplateRatingOut, status_code=201)
async def rate_template(
    template_id: int,
    body: TemplateRatingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TemplateRating:
    """Submit a rating for a community template."""
    template = await _get_template_or_404(db, template_id)

    # Check if user already rated this template
    existing = await db.execute(
        select(TemplateRating).where(
            TemplateRating.community_template_id == template.id,
            TemplateRating.user_id == current_user.id,
        )
    )
    existing_rating = existing.scalar_one_or_none()

    if existing_rating is not None:
        # Update existing rating
        existing_rating.rating = body.score
        existing_rating.comment = body.review
        await db.commit()
        await db.refresh(existing_rating)
        rating_obj = existing_rating
    else:
        # Create new rating
        rating_obj = TemplateRating(
            community_template_id=template.id,
            user_id=current_user.id,
            rating=body.score,
            comment=body.review,
        )
        db.add(rating_obj)
        await db.flush()

    # Recalculate average rating on the template
    avg_result = await db.execute(
        select(func.avg(TemplateRating.rating), func.count(TemplateRating.id)).where(
            TemplateRating.community_template_id == template.id,
        )
    )
    avg_rating, count = avg_result.one()
    template.rating = avg_rating
    template.rating_count = count
    await db.commit()
    await db.refresh(rating_obj)
    return rating_obj
