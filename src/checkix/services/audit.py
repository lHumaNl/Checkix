"""Service layer for immutable audit-log recording and querying."""

from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.models.audit import AuditLog
from checkix.models.user import User


class AuditService:
    """Async service for writing and querying audit-log entries.

    Every write method is a thin convenience wrapper around ``log_action``
    that pre-fills the ``action`` parameter.  Logs are **append-only** --
    there is no update or delete operation.
    """

    # ------------------------------------------------------------------
    # Core write
    # ------------------------------------------------------------------

    @staticmethod
    async def log_action(
        db: AsyncSession,
        user_id: int | None,
        action: str,
        entity_type: str,
        entity_id: int,
        *,
        entity_name: str | None = None,
        checklist_instance_id: int | None = None,
        changes: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        additional_data: dict | None = None,
    ) -> AuditLog:
        """Record a single audit-log entry.

        This is the single source of truth for audit writes.  All
        convenience helpers delegate here.

        Returns the persisted ``AuditLog``.
        """
        entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            checklist_instance_id=checklist_instance_id,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data,
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        return entry

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def log_create(
        db: AsyncSession,
        user_id: int | None,
        entity_type: str,
        entity_id: int,
        *,
        entity_name: str | None = None,
        changes: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        additional_data: dict | None = None,
    ) -> AuditLog:
        """Record a ``create`` action."""
        return await AuditService.log_action(
            db,
            user_id=user_id,
            action="create",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data,
        )

    @staticmethod
    async def log_update(
        db: AsyncSession,
        user_id: int | None,
        entity_type: str,
        entity_id: int,
        *,
        entity_name: str | None = None,
        changes: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        additional_data: dict | None = None,
    ) -> AuditLog:
        """Record an ``update`` action."""
        return await AuditService.log_action(
            db,
            user_id=user_id,
            action="update",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data,
        )

    @staticmethod
    async def log_delete(
        db: AsyncSession,
        user_id: int | None,
        entity_type: str,
        entity_id: int,
        *,
        entity_name: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        additional_data: dict | None = None,
    ) -> AuditLog:
        """Record a ``delete`` action."""
        return await AuditService.log_action(
            db,
            user_id=user_id,
            action="delete",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data,
        )

    @staticmethod
    async def log_complete(
        db: AsyncSession,
        user_id: int | None,
        entity_type: str,
        entity_id: int,
        *,
        entity_name: str | None = None,
        checklist_instance_id: int | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        additional_data: dict | None = None,
    ) -> AuditLog:
        """Record a ``complete`` action."""
        return await AuditService.log_action(
            db,
            user_id=user_id,
            action="complete",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            checklist_instance_id=checklist_instance_id,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=additional_data,
        )

    # ------------------------------------------------------------------
    # Read / Query
    # ------------------------------------------------------------------

    @staticmethod
    async def get_entity_logs(
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
        *,
        limit: int = 100,
    ) -> Sequence[AuditLog]:
        """Return audit-log entries for a specific entity.

        Results are ordered by ``created_at`` descending (newest first).
        """
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
            )
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_user_logs(
        db: AsyncSession,
        user_id: int,
        *,
        limit: int = 100,
    ) -> Sequence[AuditLog]:
        """Return audit-log entries performed by a specific user.

        Results are ordered by ``created_at`` descending (newest first).
        """
        stmt = (
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
