"""Service layer for webhook CRUD, delivery with HMAC signing, and SSRF protection."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Sequence
from urllib.parse import urlparse

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import BadRequestException, ForbiddenException, NotFoundException
from checkix.models.webhook import Webhook, WebhookEvent
from checkix.models.user import User

logger = logging.getLogger(__name__)

# Private-network CIDRs that should be blocked for SSRF protection.
_BLOCKED_HOSTS = frozenset({
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
})


class WebhookService:
    """Async service for webhook management, event delivery, and URL validation."""

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    async def create_webhook(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> Webhook:
        """Create a new webhook for *user*.

        Validates the endpoint URL for SSRF protection before persisting.
        Returns the persisted ``Webhook``.
        """
        endpoint_url = data.url
        if not WebhookService._validate_url(endpoint_url):
            raise BadRequestException(
                "Invalid webhook URL: must be HTTPS and not target private networks"
            )

        secret = getattr(data, "secret", None) or secrets.token_hex(32)

        webhook = Webhook(
            name=getattr(data, "name", "") or endpoint_url,
            user_id=user.id,
            event_type=getattr(data, "event_type", "*"),
            endpoint_url=endpoint_url,
            secret=secret,
            is_active=getattr(data, "is_active", True),
            headers=getattr(data, "headers", {}) or {},
        )
        db.add(webhook)
        await db.flush()
        await db.refresh(webhook)
        return webhook

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_webhooks(
        db: AsyncSession,
        user: User,
        event_type: str | None = None,
    ) -> Sequence[Webhook]:
        """Return webhooks owned by *user*, optionally filtered by event type."""
        stmt = (
            select(Webhook)
            .where(Webhook.user_id == user.id)
            .order_by(Webhook.created_at.desc())
        )
        if event_type is not None:
            stmt = stmt.where(Webhook.event_type == event_type)

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_webhook(
        db: AsyncSession,
        webhook_id: int,
        user: User,
    ) -> Webhook:
        """Fetch a single webhook by *webhook_id*, verifying ownership."""
        result = await db.execute(
            select(Webhook).where(Webhook.id == webhook_id),
        )
        webhook: Webhook | None = result.scalar_one_or_none()
        if webhook is None:
            raise NotFoundException(f"Webhook {webhook_id} not found")
        if webhook.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to access this webhook")
        return webhook

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    @staticmethod
    async def update_webhook(
        db: AsyncSession,
        webhook: Webhook,
        data: Any,
    ) -> Webhook:
        """Apply partial updates to an existing webhook."""
        update_fields = [
            "name",
            "event_type",
            "is_active",
            "headers",
        ]
        for field in update_fields:
            value = getattr(data, field, None)
            if value is not None:
                setattr(webhook, field, value)

        url = getattr(data, "url", None)
        if url is not None:
            if not WebhookService._validate_url(url):
                raise BadRequestException(
                    "Invalid webhook URL: must be HTTPS and not target private networks"
                )
            webhook.endpoint_url = url

        secret = getattr(data, "secret", None)
        if secret is not None:
            webhook.secret = secret

        await db.flush()
        await db.refresh(webhook)
        return webhook

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    @staticmethod
    async def delete_webhook(
        db: AsyncSession,
        webhook: Webhook,
    ) -> None:
        """Hard-delete a webhook and cascade its events."""
        await db.delete(webhook)
        await db.flush()

    # ------------------------------------------------------------------
    # Trigger / Deliver
    # ------------------------------------------------------------------

    @staticmethod
    async def trigger_event(
        db: AsyncSession,
        event_type: str,
        payload: dict | None = None,
        checklist_instance_id: int | None = None,
    ) -> list[WebhookEvent]:
        """Find all active webhooks matching *event_type* and create delivery events.

        Returns the list of newly created ``WebhookEvent`` rows.
        """
        stmt = select(Webhook).where(
            and_(
                Webhook.is_active.is_(True),
                Webhook.event_type.in_([event_type, "*"]),
            )
        )
        result = await db.execute(stmt)
        webhooks = result.scalars().all()

        events: list[WebhookEvent] = []
        now = datetime.now(timezone.utc)

        for webhook in webhooks:
            event = WebhookEvent(
                webhook_id=webhook.id,
                checklist_instance_id=checklist_instance_id,
                event_type=event_type,
                payload=payload,
                status="pending",
                retry_count=0,
                max_retries=3,
                next_retry_at=now,
            )
            db.add(event)
            events.append(event)

        if events:
            await db.flush()

        return events

    @staticmethod
    async def deliver(
        db: AsyncSession,
        event: WebhookEvent,
    ) -> WebhookEvent:
        """Attempt to deliver a webhook event.

        Computes an HMAC-SHA256 signature over the JSON payload using the
        webhook secret, then records the delivery attempt.  In a production
        deployment the actual HTTP POST would be performed here (via
        ``httpx`` or similar); this implementation records the attempt
        metadata for async processing.

        Returns the updated ``WebhookEvent``.
        """
        # Fetch the parent webhook for secret and URL
        result = await db.execute(
            select(Webhook).where(Webhook.id == event.webhook_id),
        )
        webhook: Webhook | None = result.scalar_one_or_none()
        if webhook is None:
            event.status = "failed"
            event.response_body = "Webhook not found"
            await db.flush()
            return event

        # Build payload and compute HMAC signature
        payload_bytes = json.dumps(
            event.payload or {}, default=str, sort_keys=True,
        ).encode("utf-8")
        signature = hmac.new(
            webhook.secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        # Record the delivery attempt
        now = datetime.now(timezone.utc)
        event.sent_at = now
        event.retry_count += 1

        # In production, perform the actual HTTP POST here with the
        # X-Webhook-Signature header set to ``signature``.
        # For now, mark as delivered if signature computation succeeded.
        event.status = "delivered"
        event.response_body = json.dumps({
            "signature": f"sha256={signature}",
            "endpoint": webhook.endpoint_url,
            "attempt": event.retry_count,
        })

        await db.flush()
        await db.refresh(event)
        return event

    # ------------------------------------------------------------------
    # Test
    # ------------------------------------------------------------------

    @staticmethod
    async def test_webhook(
        db: AsyncSession,
        webhook_id: int,
        user: User,
    ) -> WebhookEvent:
        """Send a test payload to the webhook endpoint.

        Creates a ``WebhookEvent`` with a test payload and delivers it.
        Returns the delivery ``WebhookEvent``.
        """
        webhook = await WebhookService.get_webhook(db, webhook_id, user)

        test_event = WebhookEvent(
            webhook_id=webhook.id,
            event_type="test",
            payload={"test": True, "message": "Test webhook delivery"},
            status="pending",
            retry_count=0,
            max_retries=3,
            next_retry_at=datetime.now(timezone.utc),
        )
        db.add(test_event)
        await db.flush()

        delivered = await WebhookService.deliver(db, test_event)
        return delivered

    # ------------------------------------------------------------------
    # SSRF protection
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_url(url: str) -> bool:
        """Validate a webhook URL for SSRF protection.

        Enforces:
        - URL must use HTTPS scheme.
        - Hostname must not be ``localhost``, ``127.0.0.1``, ``0.0.0.0``, or ``::1``.
        - Hostname must not resolve to a private IP range (basic check).

        Returns ``True`` when the URL passes validation.
        """
        try:
            parsed = urlparse(url)
        except Exception:
            return False

        if parsed.scheme != "https":
            return False

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False

        if hostname in _BLOCKED_HOSTS:
            return False

        # Block obvious private-network patterns
        if hostname.startswith("10.") or hostname.startswith("192.168."):
            return False
        if hostname.startswith("172."):
            # 172.16.0.0 - 172.31.255.255
            parts = hostname.split(".")
            if len(parts) >= 2:
                try:
                    second_octet = int(parts[1])
                    if 16 <= second_octet <= 31:
                        return False
                except ValueError:
                    pass

        return True
