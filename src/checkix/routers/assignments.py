"""Router module: assignments."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import NotFoundException
from checkix.models.assignment import Assignment
from checkix.models.user import User
from checkix.schemas.assignment import AssignmentCreate, AssignmentOut
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["assignments"])


@router.get("/", response_model=None)
async def list_assignments(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    assignment_type: Annotated[Optional[str], Query()] = None,
) -> dict:
    """Return a paginated list of assignments for the current user."""
    query = (
        select(Assignment)
        .where(Assignment.user_id == current_user.id)
        .order_by(Assignment.created_at.desc())
    )
    if assignment_type is not None:
        query = query.where(Assignment.assignment_type == assignment_type)

    return await paginate(db, query, pagination)


@router.post("/", response_model=AssignmentOut, status_code=201)
async def create_assignment(
    body: AssignmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Assignment:
    """Create a new assignment."""
    assignment = Assignment(
        user_id=current_user.id,
        assignment_type="template",
        checklist_template_id=body.template_id,
        assignee_type=body.assignee_type or "user",
        assignee_user_id=body.assignee_id,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}/", response_model=MessageResponse)
async def delete_assignment(
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete an assignment permanently."""
    result = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.user_id == current_user.id,
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise NotFoundException(detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()
    return MessageResponse(message="Assignment deleted")
