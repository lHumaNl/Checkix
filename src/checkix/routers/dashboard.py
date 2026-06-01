"""Router module: dashboard."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.models.checklist import ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance, CompletionLog
from checkix.models.todo import TodoList, TodoItem
from checkix.models.user import User
from checkix.schemas.stats import DashboardStatsOut

router = APIRouter(tags=["dashboard"])


@router.get("/stats/", response_model=DashboardStatsOut)
async def get_dashboard_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> DashboardStatsOut:
    """Return dashboard statistics for the current user."""
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total templates
    templates_count = await db.execute(
        select(func.count()).select_from(ChecklistTemplate).where(
            ChecklistTemplate.user_id == current_user.id,
            ChecklistTemplate.is_deleted.is_(False),
        )
    )
    total_templates = templates_count.scalar_one()

    # Active instances
    active_instances_count = await db.execute(
        select(func.count()).select_from(ChecklistInstance).where(
            ChecklistInstance.user_id == current_user.id,
            ChecklistInstance.status.in_(["draft", "in_progress"]),
        )
    )
    active_instances = active_instances_count.scalar_one()

    # Completed today
    completed_today_count = await db.execute(
        select(func.count()).select_from(ChecklistInstance).where(
            ChecklistInstance.user_id == current_user.id,
            ChecklistInstance.status == "completed",
            ChecklistInstance.completed_at >= today_start,
        )
    )
    completed_today = completed_today_count.scalar_one()

    # Overdue instances
    overdue_count = await db.execute(
        select(func.count()).select_from(ChecklistInstance).where(
            ChecklistInstance.user_id == current_user.id,
            ChecklistInstance.status.in_(["draft", "in_progress"]),
        )
    )
    overdue_instances = overdue_count.scalar_one()

    # Average completion rate
    avg_rate = await db.execute(
        select(func.avg(ChecklistInstance.progress_percentage)).where(
            ChecklistInstance.user_id == current_user.id,
            ChecklistInstance.status == "completed",
        )
    )
    avg_completion_rate = avg_rate.scalar_one_or_none()

    return DashboardStatsOut(
        total_templates=total_templates,
        active_instances=active_instances,
        completed_today=completed_today,
        overdue_instances=overdue_instances,
        avg_completion_rate=float(avg_completion_rate) if avg_completion_rate else None,
    )


@router.get("/chart/completion/")
async def get_completion_chart(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: int = 30,
) -> dict:
    """Return daily completion counts for charting over the last N days."""
    now = datetime.now()
    start_date = now - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(ChecklistInstance.completed_at).label("date"),
            func.count(ChecklistInstance.id).label("count"),
        )
        .where(
            ChecklistInstance.user_id == current_user.id,
            ChecklistInstance.status == "completed",
            ChecklistInstance.completed_at >= start_date,
        )
        .group_by(func.date(ChecklistInstance.completed_at))
        .order_by(func.date(ChecklistInstance.completed_at))
    )

    rows = result.all()
    return {
        "period_days": days,
        "data": [
            {"date": str(row.date), "count": row.count}
            for row in rows
        ],
    }


@router.get("/heatmap/")
async def get_heatmap(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    days: int = 90,
) -> dict:
    """Return activity heatmap data (daily action counts) for the last N days."""
    now = datetime.now()
    start_date = now - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(CompletionLog.timestamp).label("date"),
            func.count(CompletionLog.id).label("count"),
        )
        .join(
            ChecklistInstance,
            ChecklistInstance.id == CompletionLog.instance_id,
        )
        .where(
            ChecklistInstance.user_id == current_user.id,
            CompletionLog.timestamp >= start_date,
        )
        .group_by(func.date(CompletionLog.timestamp))
        .order_by(func.date(CompletionLog.timestamp))
    )

    rows = result.all()
    return {
        "period_days": days,
        "data": [
            {"date": str(row.date), "count": row.count}
            for row in rows
        ],
    }


@router.get("/activities/")
async def get_recent_activities(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of recent activity log entries."""
    query = (
        select(CompletionLog)
        .join(
            ChecklistInstance,
            ChecklistInstance.id == CompletionLog.instance_id,
        )
        .where(ChecklistInstance.user_id == current_user.id)
        .order_by(CompletionLog.timestamp.desc())
    )

    return await paginate(db, query, pagination)
