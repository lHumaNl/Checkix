"""Router module: assignments."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate_mapped
from checkix.exceptions import NotFoundException
from checkix.models.assignment import Assignment
from checkix.models.checklist import ChecklistItem, ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.user import Group, User
from checkix.schemas.assignment import AssignmentCreate, AssignmentOut
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["assignments"])


def _user_name(first_name: str | None, last_name: str | None, email: str | None, username: str | None) -> str:
    full_name = " ".join(part for part in (first_name, last_name) if part)
    return full_name or email or username or ""


def _fallback_label(label: str, value: int | None) -> str:
    return f"{label} #{value}" if value is not None else ""


def _target_display(data: dict) -> str:
    if data["assignment_type"] == "item":
        return data["checklist_item_title"] or _fallback_label("Item", data["checklist_item"])
    if data["assignment_type"] == "runtime":
        return data["checklist_instance_name"] or _fallback_label("Instance", data["checklist_instance"])
    return data["checklist_template_name"] or _fallback_label("Template", data["checklist_template"])


def _assignee_display(data: dict) -> str:
    if data["assignee_type"] == "group":
        return data["assignee_group_name"] or _fallback_label("Group", data["assignee_group"])
    if data["assignee_type"] == "parameter":
        return data["assignee_parameter"] or "Parameter"
    if data["assignee_type"] == "manager":
        return "Manager"
    return data["assignee_user_name"] or _fallback_label("User", data["assignee_user"])


def _assignment_row(row) -> dict:
    assignment = row[0]
    data = {
        "id": assignment.id,
        "assignment_type": assignment.assignment_type,
        "checklist_template": assignment.checklist_template_id,
        "checklist_template_name": row.checklist_template_name,
        "checklist_item": assignment.checklist_item_id,
        "checklist_item_title": row.checklist_item_title,
        "checklist_instance": assignment.checklist_instance_id,
        "checklist_instance_name": row.checklist_instance_name,
        "assignee_type": assignment.assignee_type,
        "assignee_user": assignment.assignee_user_id,
        "assignee_user_name": _user_name(row.first_name, row.last_name, row.email, row.username) or None,
        "assignee_group": assignment.assignee_group_id,
        "assignee_group_name": row.assignee_group_name,
        "assignee_parameter": assignment.assignee_parameter or "",
        "is_exclusive": assignment.is_exclusive,
        "auto_notify": assignment.auto_notify,
        "created_at": assignment.created_at,
        "updated_at": assignment.updated_at,
    }
    data["target_display"] = _target_display(data)
    data["assignee_display"] = _assignee_display(data)
    return data


@router.get("/", response_model=None)
async def list_assignments(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    assignment_type: Annotated[Optional[str], Query()] = None,
) -> dict:
    """Return a paginated list of assignments for the current user."""
    assignee = aliased(User)
    query = (
        select(
            Assignment,
            ChecklistTemplate.name.label("checklist_template_name"),
            ChecklistItem.title.label("checklist_item_title"),
            ChecklistInstance.name.label("checklist_instance_name"),
            assignee.first_name,
            assignee.last_name,
            assignee.email,
            assignee.username,
            Group.name.label("assignee_group_name"),
        )
        .outerjoin(ChecklistTemplate, ChecklistTemplate.id == Assignment.checklist_template_id)
        .outerjoin(ChecklistItem, ChecklistItem.id == Assignment.checklist_item_id)
        .outerjoin(ChecklistInstance, ChecklistInstance.id == Assignment.checklist_instance_id)
        .outerjoin(assignee, assignee.id == Assignment.assignee_user_id)
        .outerjoin(Group, Group.id == Assignment.assignee_group_id)
        .where(Assignment.user_id == current_user.id)
        .order_by(Assignment.created_at.desc())
    )
    if assignment_type is not None:
        query = query.where(Assignment.assignment_type == assignment_type)

    return await paginate_mapped(db, query, pagination, _assignment_row)


@router.post("/", response_model=AssignmentOut, status_code=201)
async def create_assignment(
    body: AssignmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Create a new assignment."""
    assignment = Assignment(
        user_id=current_user.id,
        assignment_type=body.assignment_type,
        checklist_template_id=body.checklist_template,
        checklist_item_id=body.checklist_item,
        checklist_instance_id=body.checklist_instance,
        assignee_type=body.assignee_type,
        assignee_user_id=body.assignee_user,
        assignee_group_id=body.assignee_group,
        assignee_parameter=body.assignee_parameter,
        is_exclusive=body.is_exclusive,
        auto_notify=body.auto_notify,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    assignee = aliased(User)
    query = (
        select(
            Assignment,
            ChecklistTemplate.name.label("checklist_template_name"),
            ChecklistItem.title.label("checklist_item_title"),
            ChecklistInstance.name.label("checklist_instance_name"),
            assignee.first_name,
            assignee.last_name,
            assignee.email,
            assignee.username,
            Group.name.label("assignee_group_name"),
        )
        .outerjoin(ChecklistTemplate, ChecklistTemplate.id == Assignment.checklist_template_id)
        .outerjoin(ChecklistItem, ChecklistItem.id == Assignment.checklist_item_id)
        .outerjoin(ChecklistInstance, ChecklistInstance.id == Assignment.checklist_instance_id)
        .outerjoin(assignee, assignee.id == Assignment.assignee_user_id)
        .outerjoin(Group, Group.id == Assignment.assignee_group_id)
        .where(Assignment.id == assignment.id)
    )
    row = (await db.execute(query)).one()
    return _assignment_row(row)


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
