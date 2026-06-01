"""Service layer for notification scheduling, sequencing, and delivery processing."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Sequence

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import BadRequestException, NotFoundException
from checkix.models.notification import (
    NotificationLog,
    NotificationRule,
    NotificationSequence,
)
from checkix.models.user import User

logger = logging.getLogger(__name__)


class NotificationService:
    """Async service for notification rule management and delivery processing."""

    # ------------------------------------------------------------------
    # Schedule / Create
    # ------------------------------------------------------------------

    @staticmethod
    async def schedule_notification(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> NotificationRule:
        """Create a notification rule with optional sequences.

        Creates the ``NotificationRule`` header and, if sequences are
        provided in *data*, persists each ``NotificationSequence`` row.

        Returns the persisted ``NotificationRule``.
        """
        rule = NotificationRule(
            checklist_template_id=getattr(data, "checklist_template_id", None)
            or getattr(data, "template_id", None),
            checklist_item_id=getattr(data, "checklist_item_id", None),
            assignment_id=getattr(data, "assignment_id", None),
            created_by_id=user.id,
            event_type=data.event_type,
            is_active=getattr(data, "is_active", True),
        )
        db.add(rule)
        await db.flush()

        # Create sequences if provided
        sequences_data: list[dict] | None = getattr(data, "sequences", None)
        if sequences_data:
            for seq_data in sequences_data:
                seq = NotificationSequence(
                    notification_rule_id=rule.id,
                    sequence_order=seq_data.get("sequence_order", 0),
                    trigger_offset_minutes=seq_data.get("trigger_offset_minutes", 0),
                    recipient_type=seq_data.get("recipient_type", "assignee"),
                    recipient_group_id=seq_data.get("recipient_group_id", None),
                    custom_email=seq_data.get("custom_email", None),
                    email_subject=seq_data.get("email_subject", None),
                    email_body=seq_data.get("email_body", None),
                )
                db.add(seq)
            await db.flush()

        await db.refresh(rule)
        return rule

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_rules(
        db: AsyncSession,
        user: User,
        template_id: int | None = None,
    ) -> Sequence[NotificationRule]:
        """Return notification rules created by *user*."""
        stmt = (
            select(NotificationRule)
            .where(NotificationRule.created_by_id == user.id)
            .order_by(NotificationRule.created_at.desc())
        )
        if template_id is not None:
            stmt = stmt.where(NotificationRule.checklist_template_id == template_id)

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_rule(
        db: AsyncSession,
        rule_id: int,
        user: User,
    ) -> NotificationRule:
        """Fetch a single notification rule, verifying ownership."""
        result = await db.execute(
            select(NotificationRule).where(NotificationRule.id == rule_id),
        )
        rule: NotificationRule | None = result.scalar_one_or_none()
        if rule is None:
            raise NotFoundException(f"Notification rule {rule_id} not found")
        if rule.created_by_id != user.id and not user.is_admin:
            raise NotFoundException(f"Notification rule {rule_id} not found")
        return rule

    # ------------------------------------------------------------------
    # Process due notifications
    # ------------------------------------------------------------------

    @staticmethod
    async def process_due_notifications(
        db: AsyncSession,
        batch_size: int = 100,
    ) -> list[NotificationLog]:
        """Find and process notification sequences that are due for delivery.

        This method looks for active notification rules whose sequences have
        a ``trigger_offset_minutes`` that would make them due now.  For each
        matching sequence a ``NotificationLog`` entry is created with status
        ``pending``.

        In a production deployment the actual email/webhook dispatch would
        be handled by a background task consuming the pending logs.

        Returns the list of newly created ``NotificationLog`` entries.
        """
        now = datetime.now(timezone.utc)
        created_logs: list[NotificationLog] = []

        # Fetch active rules
        rules_result = await db.execute(
            select(NotificationRule).where(
                NotificationRule.is_active.is_(True),
            ).limit(batch_size)
        )
        rules = rules_result.scalars().all()

        for rule in rules:
            # Fetch sequences for the rule
            seqs_result = await db.execute(
                select(NotificationSequence).where(
                    NotificationSequence.notification_rule_id == rule.id,
                ).order_by(NotificationSequence.sequence_order)
            )
            sequences = seqs_result.scalars().all()

            for seq in sequences:
                # Determine recipient email
                recipient_email = seq.custom_email
                if not recipient_email:
                    continue

                # Check if a pending log already exists for this sequence
                existing = await db.execute(
                    select(NotificationLog).where(
                        and_(
                            NotificationLog.notification_sequence_id == seq.id,
                            NotificationLog.status == "pending",
                        )
                    )
                )
                if existing.scalar_one_or_none() is not None:
                    continue

                log = NotificationLog(
                    notification_sequence_id=seq.id,
                    recipient_email=recipient_email,
                    status="pending",
                )
                db.add(log)
                created_logs.append(log)

        if created_logs:
            await db.flush()

        return created_logs
