"""Router module: stats."""

from __future__ import annotations

import csv
import io
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.models.checklist import ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.stats import ChecklistUsageStats
from checkix.models.todo import TodoList
from checkix.models.user import User
from checkix.schemas.stats import ChecklistUsageStatsOut, OverallStatsOut

router = APIRouter(tags=["stats"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_template_filter(current_user: User):
    """Return a filter clause restricting stats to the current user's templates."""
    return ChecklistTemplate.user_id == current_user.id


async def _date_range_stats(
    db: AsyncSession,
    current_user: User,
    start_date: date,
    end_date: date,
):
    """Return ChecklistUsageStats rows filtered by a date range for the user."""
    result = await db.execute(
        select(ChecklistUsageStats)
        .join(
            ChecklistTemplate,
            ChecklistTemplate.id == ChecklistUsageStats.template_id,
        )
        .where(
            _user_template_filter(current_user),
            ChecklistUsageStats.date >= start_date,
            ChecklistUsageStats.date <= end_date,
        )
        .order_by(ChecklistUsageStats.date)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

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


@router.get("/by_date_range/", response_model=None)
async def get_stats_by_date_range(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    start_date: Annotated[date, Query(description="Start of date range (inclusive)")] = date.today() - timedelta(days=30),
    end_date: Annotated[date, Query(description="End of date range (inclusive)")] = date.today(),
) -> dict:
    """Return usage statistics filtered by a date range, paginated."""
    query = (
        select(ChecklistUsageStats)
        .join(
            ChecklistTemplate,
            ChecklistTemplate.id == ChecklistUsageStats.template_id,
        )
        .where(
            _user_template_filter(current_user),
            ChecklistUsageStats.date >= start_date,
            ChecklistUsageStats.date <= end_date,
        )
        .order_by(ChecklistUsageStats.date)
    )
    return await paginate(db, query, pagination)


@router.get("/recent/", response_model=None)
async def get_recent_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    days: Annotated[int, Query(ge=1, description="Number of recent days")] = 30,
) -> dict:
    """Return stats for the last N days, paginated."""
    cutoff = date.today() - timedelta(days=days)
    query = (
        select(ChecklistUsageStats)
        .join(
            ChecklistTemplate,
            ChecklistTemplate.id == ChecklistUsageStats.template_id,
        )
        .where(
            _user_template_filter(current_user),
            ChecklistUsageStats.date >= cutoff,
        )
        .order_by(desc(ChecklistUsageStats.date))
    )
    return await paginate(db, query, pagination)


@router.get("/top_templates/", response_model=None)
async def get_top_templates(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    start_date: Annotated[date, Query(description="Start of date range (inclusive)")] = date.today() - timedelta(days=30),
    end_date: Annotated[date, Query(description="End of date range (inclusive)")] = date.today(),
) -> dict:
    """Return top templates by usage count within a date range, paginated."""
    subq = (
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
        .where(
            _user_template_filter(current_user),
            ChecklistUsageStats.date >= start_date,
            ChecklistUsageStats.date <= end_date,
        )
        .group_by(ChecklistUsageStats.template_id, ChecklistTemplate.name)
        .order_by(desc(func.sum(ChecklistUsageStats.instances_created)))
        .subquery()
    )

    query = select(subq)
    return await paginate(db, query, pagination)


@router.get("/export_csv/")
async def export_stats_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    start_date: Annotated[date, Query(description="Start of date range (inclusive)")] = date.today() - timedelta(days=30),
    end_date: Annotated[date, Query(description="End of date range (inclusive)")] = date.today(),
) -> StreamingResponse:
    """Export usage statistics as a CSV file for the given date range."""
    rows = await _date_range_stats(db, current_user, start_date, end_date)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "date",
        "template_id",
        "instances_created",
        "instances_completed",
        "avg_completion_time_seconds",
        "avg_completion_percentage",
    ])
    for row in rows:
        writer.writerow([
            row.date,
            row.template_id,
            row.instances_created,
            row.instances_completed,
            row.avg_completion_time_seconds or "",
            row.avg_completion_percentage or "",
        ])

    buf.seek(0)
    filename = f"stats_{start_date.isoformat()}_{end_date.isoformat()}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
