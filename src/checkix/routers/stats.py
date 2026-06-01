"""Router module: stats."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import get_current_user
from checkix.models.checklist import ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.stats import ChecklistUsageStats
from checkix.models.todo import TodoList
from checkix.models.user import User
from checkix.schemas.stats import ChecklistUsageStatsOut, OverallStatsOut

router = APIRouter(tags=["stats"])


@router.get("/overall/", response_model=OverallStatsOut)
async def get_overall_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> OverallStatsOut:
    """Return overall platform statistics for the current user."""
    # Count user's templates
    templates_result = await db.execute(
        select(func.count()).select_from(ChecklistTemplate).where(
            ChecklistTemplate.user_id == current_user.id,
            ChecklistTemplate.is_deleted.is_(False),
        )
    )
    total_checklists = templates_result.scalar_one()

    # Count user's instances
    instances_result = await db.execute(
        select(func.count()).select_from(ChecklistInstance).where(
            ChecklistInstance.user_id == current_user.id,
        )
    )
    total_instances = instances_result.scalar_one()

    # Count user's todo lists
    todos_result = await db.execute(
        select(func.count()).select_from(TodoList).where(
            TodoList.user_id == current_user.id,
            TodoList.is_deleted.is_(False),
        )
    )
    total_todos = todos_result.scalar_one()

    return OverallStatsOut(
        total_users=0,
        total_checklists=total_checklists,
        total_instances=total_instances,
        total_todos=total_todos,
        total_runs_today=0,
    )


@router.get("/by_category/", response_model=None) # was list[ChecklistUsageStatsOut])
async def get_stats_by_category(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ChecklistUsageStatsOut]:
    """Return usage statistics grouped by template."""
    result = await db.execute(
        select(
            ChecklistUsageStats.template_id,
            ChecklistTemplate.name.label("template_name"),
            func.sum(ChecklistUsageStats.instances_created).label("total_runs"),
            func.sum(ChecklistUsageStats.instances_completed).label("completed_runs"),
            func.avg(ChecklistUsageStats.avg_completion_time_seconds).label(
                "avg_completion_time_seconds"
            ),
            func.avg(ChecklistUsageStats.avg_completion_percentage).label(
                "completion_rate"
            ),
        )
        .join(
            ChecklistTemplate,
            ChecklistTemplate.id == ChecklistUsageStats.template_id,
        )
        .where(ChecklistTemplate.user_id == current_user.id)
        .group_by(ChecklistUsageStats.template_id, ChecklistTemplate.name)
    )

    rows = result.all()
    return [
        ChecklistUsageStatsOut(
            template_id=row.template_id,
            template_name=row.template_name,
            total_runs=row.total_runs or 0,
            completed_runs=row.completed_runs or 0,
            avg_completion_time_seconds=row.avg_completion_time_seconds,
            completion_rate=float(row.completion_rate) if row.completion_rate else None,
        )
        for row in rows
    ]
