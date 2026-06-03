"""Statistics and dashboard schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from checkix.schemas.common import ORMSchema


class ChecklistUsageStatsOut(ORMSchema):
    template_id: int
    template_name: Optional[str] = None
    total_runs: int = 0
    completed_runs: int = 0
    avg_completion_time_seconds: Optional[float] = None
    completion_rate: Optional[float] = None


class DashboardStatsOut(ORMSchema):
    total_templates: int = 0
    active_instances: int = 0
    completed_today: int = 0
    overdue_instances: int = 0
    avg_completion_rate: Optional[float] = None
    total_todos: int = 0
    completed_todos: int = 0
    upcoming_events: int = 0


class OverallStatsOut(ORMSchema):
    total_users: int = 0
    total_checklists: int = 0
    total_instances: int = 0
    total_todos: int = 0
    total_runs_today: int = 0
    uptime_percentage: Optional[float] = None
