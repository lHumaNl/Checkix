"""Service layer for dashboard statistics, charts, heatmap, and activity feeds."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Sequence

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.models.checklist import ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.community import CommunityTemplate
from checkix.models.stats import ChecklistUsageStats
from checkix.models.todo import TodoList
from checkix.models.user import User


class StatsService:
    """Async service for computing usage statistics and activity data."""

    # ------------------------------------------------------------------
    # Dashboard stats
    # ------------------------------------------------------------------

    @staticmethod
    async def get_dashboard_stats(
        db: AsyncSession,
        user: User,
    ) -> dict[str, Any]:
        """Return aggregate statistics for *user*'s dashboard.

        Returns a dict with keys:
        - ``total_templates`` -- count of non-deleted templates.
        - ``active_instances`` -- count of in-progress instances.
        - ``completed_today`` -- instances completed today.
        - ``overdue_instances`` -- in-progress instances with no activity
          for 7+ days (heuristic).
        - ``avg_completion_rate`` -- average ``progress_percentage`` across
          all non-draft instances.
        """
        # Total templates
        tmpl_result = await db.execute(
            select(func.count())
            .select_from(ChecklistTemplate)
            .where(
                and_(
                    ChecklistTemplate.user_id == user.id,
                    ChecklistTemplate.is_deleted.is_(False),
                )
            )
        )
        total_templates: int = tmpl_result.scalar() or 0

        # Active instances
        active_result = await db.execute(
            select(func.count())
            .select_from(ChecklistInstance)
            .where(
                and_(
                    ChecklistInstance.user_id == user.id,
                    ChecklistInstance.status == "in_progress",
                )
            )
        )
        active_instances: int = active_result.scalar() or 0

        # Completed today
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        completed_result = await db.execute(
            select(func.count())
            .select_from(ChecklistInstance)
            .where(
                and_(
                    ChecklistInstance.user_id == user.id,
                    ChecklistInstance.status == "completed",
                    ChecklistInstance.completed_at >= today_start,
                )
            )
        )
        completed_today: int = completed_result.scalar() or 0

        # Overdue heuristic: in-progress instances with updated_at > 7 days ago
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        overdue_result = await db.execute(
            select(func.count())
            .select_from(ChecklistInstance)
            .where(
                and_(
                    ChecklistInstance.user_id == user.id,
                    ChecklistInstance.status == "in_progress",
                    ChecklistInstance.updated_at < week_ago,
                )
            )
        )
        overdue_instances: int = overdue_result.scalar() or 0

        # Average completion rate
        avg_result = await db.execute(
            select(func.avg(ChecklistInstance.progress_percentage))
            .select_from(ChecklistInstance)
            .where(
                and_(
                    ChecklistInstance.user_id == user.id,
                    ChecklistInstance.status != "draft",
                )
            )
        )
        avg_completion_rate: float | None = avg_result.scalar()

        return {
            "total_templates": total_templates,
            "active_instances": active_instances,
            "completed_today": completed_today,
            "overdue_instances": overdue_instances,
            "avg_completion_rate": round(avg_completion_rate, 1)
            if avg_completion_rate is not None
            else None,
        }

    # ------------------------------------------------------------------
    # Completion chart
    # ------------------------------------------------------------------

    @staticmethod
    async def get_completion_chart(
        db: AsyncSession,
        user: User,
        days: int = 30,
    ) -> list[dict[str, Any]]:
        """Return daily completion counts for the past *days* days.

        Each entry is ``{"date": "YYYY-MM-DD", "completed": N}``.
        """
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=days)
        start_date = start.date()

        result = await db.execute(
            select(
                func.date_trunc("day", ChecklistInstance.completed_at).label("day"),
                func.count().label("cnt"),
            )
            .select_from(ChecklistInstance)
            .where(
                and_(
                    ChecklistInstance.user_id == user.id,
                    ChecklistInstance.status == "completed",
                    ChecklistInstance.completed_at >= start,
                )
            )
            .group_by("day")
            .order_by("day")
        )
        rows = result.all()

        # Build a dict of date -> count for gap-filling
        counts: dict[date, int] = {}
        for day, cnt in rows:
            d = day.date() if hasattr(day, "date") else day
            counts[d] = cnt

        chart: list[dict[str, Any]] = []
        for i in range(days + 1):
            d = start_date + timedelta(days=i)
            chart.append({
                "date": d.isoformat(),
                "completed": counts.get(d, 0),
            })

        return chart

    # ------------------------------------------------------------------
    # Heatmap
    # ------------------------------------------------------------------

    @staticmethod
    async def get_heatmap(
        db: AsyncSession,
        user: User,
        weeks: int = 12,
    ) -> list[dict[str, Any]]:
        """Return activity heatmap data (daily instance creation counts).

        Each entry is ``{"date": "YYYY-MM-DD", "count": N}`` covering the
        past *weeks* weeks.
        """
        now = datetime.now(timezone.utc)
        start = now - timedelta(weeks=weeks)
        start_date = start.date()

        result = await db.execute(
            select(
                func.date_trunc("day", ChecklistInstance.created_at).label("day"),
                func.count().label("cnt"),
            )
            .select_from(ChecklistInstance)
            .where(
                and_(
                    ChecklistInstance.user_id == user.id,
                    ChecklistInstance.created_at >= start,
                )
            )
            .group_by("day")
            .order_by("day")
        )
        rows = result.all()

        counts: dict[date, int] = {}
        for day, cnt in rows:
            d = day.date() if hasattr(day, "date") else day
            counts[d] = cnt

        total_days = weeks * 7
        heatmap: list[dict[str, Any]] = []
        for i in range(total_days + 1):
            d = start_date + timedelta(days=i)
            heatmap.append({
                "date": d.isoformat(),
                "count": counts.get(d, 0),
            })

        return heatmap

    # ------------------------------------------------------------------
    # Activities
    # ------------------------------------------------------------------

    @staticmethod
    async def get_activities(
        db: AsyncSession,
        user: User,
        limit: int = 20,
    ) -> Sequence[ChecklistInstance]:
        """Return recent checklist instances for *user* as an activity feed.

        Results are ordered by ``updated_at`` descending.
        """
        stmt = (
            select(ChecklistInstance)
            .where(ChecklistInstance.user_id == user.id)
            .order_by(ChecklistInstance.updated_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    # ------------------------------------------------------------------
    # Overall stats (admin)
    # ------------------------------------------------------------------

    @staticmethod
    async def get_overall_stats(
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Return platform-wide aggregate statistics (admin context).

        Returns a dict with keys:
        - ``total_users`` -- total user count.
        - ``total_checklists`` -- total non-deleted templates.
        - ``total_instances`` -- total checklist instances.
        - ``total_todos`` -- total non-deleted todo lists.
        - ``total_runs_today`` -- instances created today.
        """
        from checkix.models.user import User  # noqa: F811 (re-import for clarity)

        users_result = await db.execute(
            select(func.count()).select_from(User)
        )
        total_users: int = users_result.scalar() or 0

        templates_result = await db.execute(
            select(func.count())
            .select_from(ChecklistTemplate)
            .where(ChecklistTemplate.is_deleted.is_(False))
        )
        total_checklists: int = templates_result.scalar() or 0

        instances_result = await db.execute(
            select(func.count()).select_from(ChecklistInstance)
        )
        total_instances: int = instances_result.scalar() or 0

        todos_result = await db.execute(
            select(func.count())
            .select_from(TodoList)
            .where(TodoList.is_deleted.is_(False))
        )
        total_todos: int = todos_result.scalar() or 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        runs_today_result = await db.execute(
            select(func.count())
            .select_from(ChecklistInstance)
            .where(ChecklistInstance.created_at >= today_start)
        )
        total_runs_today: int = runs_today_result.scalar() or 0

        return {
            "total_users": total_users,
            "total_checklists": total_checklists,
            "total_instances": total_instances,
            "total_todos": total_todos,
            "total_runs_today": total_runs_today,
        }

    # ------------------------------------------------------------------
    # Template stats
    # ------------------------------------------------------------------

    @staticmethod
    async def get_template_stats(
        db: AsyncSession,
        template_id: int,
        days: int = 30,
    ) -> Sequence[ChecklistUsageStats]:
        """Return daily usage statistics for a specific template.

        Results cover the past *days* days, ordered by date descending.
        """
        start_date = date.today() - timedelta(days=days)

        stmt = (
            select(ChecklistUsageStats)
            .where(
                and_(
                    ChecklistUsageStats.template_id == template_id,
                    ChecklistUsageStats.date >= start_date,
                )
            )
            .order_by(ChecklistUsageStats.date.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()
