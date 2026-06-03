"""API DTO contract tests for Ant Design frontend pages."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from checkix.models.notification import NotificationSequence
from tests.conftest import AuthenticatedUser

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("clean_database")]


async def test_assignments_list_returns_display_fields(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("assignment-contract-owner", is_staff=True)
    template = await _create_template(api_client, owner, "Safety audit")
    create_response = await api_client.post(
        "/api/assignments/",
        json={
            "assignment_type": "template",
            "checklist_template": template["id"],
            "assignee_type": "user",
            "assignee_user": owner.id,
        },
        headers=owner.headers,
    )
    list_response = await api_client.get("/api/assignments/", headers=owner.headers)

    item = list_response.json()["items"][0]
    assert create_response.status_code == 201, create_response.text
    assert item["checklist_template_name"] == "Safety audit"
    assert item["target_display"] == "Safety audit"
    assert item["assignee_display"] == "assignment-contract-owner@example.test"


async def test_run_links_list_returns_frontend_contract(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("run-link-contract-owner", is_staff=True)
    template = await _create_template(api_client, owner, "Shareable checks")
    await api_client.post("/api/run-links/", json={"template_id": template["id"]}, headers=owner.headers)
    list_response = await api_client.get("/api/run-links/", headers=owner.headers)

    item = list_response.json()["items"][0]
    assert item["checklist_template_name"] == "Shareable checks"
    assert item["template_id"] == template["id"]
    assert item["unique_id"] == item["token"]
    assert item["is_valid"] is True


async def test_notification_rules_list_returns_sequences_and_labels(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    owner = await authenticated_user_factory("notification-contract-owner")
    template = await _create_template(api_client, owner, "Safety template")
    rule_response = await api_client.post(
        "/api/notifications/rules/",
        json={"event_type": "task_due_in", "template_id": template["id"]},
        headers=owner.headers,
    )
    await _add_notification_sequence(db_session_factory, rule_response.json()["id"])
    list_response = await api_client.get("/api/notifications/rules/", headers=owner.headers)

    item = list_response.json()["items"][0]
    assert item["checklist_template_name"] == "Safety template"
    assert item["event_type_display"] == "Task Due In"
    assert item["sequences"][0]["custom_email"] == "ops@example.test"


async def test_webhooks_list_returns_frontend_contract(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("webhook-contract-owner", is_staff=True)
    create_response = await api_client.post(
        "/api/webhooks/",
        json={"name": "Deploy hook", "url": "https://example.com/hook", "events": ["instance_started"]},
        headers=owner.headers,
    )
    await api_client.post(f"/api/webhooks/{create_response.json()['id']}/test/", headers=owner.headers)
    list_response = await api_client.get("/api/webhooks/", headers=owner.headers)

    item = list_response.json()["items"][0]
    assert item["endpoint_url"] == "https://example.com/hook"
    assert item["event_type_display"] == "Instance Started"
    assert item["events_count"] == 1
    assert item["recent_events"][0]["webhook_name"] == "Deploy hook"


async def test_calendar_events_preserve_ant_design_fields(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("calendar-contract-owner")
    template = await _create_template(api_client, owner, "Launch checklist")
    create_response = await api_client.post(
        "/api/calendar-events/",
        json={
            "title": "Launch review",
            "start_time": "2026-06-02T10:00:00Z",
            "end_time": "2026-06-02T11:00:00Z",
            "event_type": "checklist",
            "reminder_minutes_before": 30,
            "checklist_template": template["id"],
        },
        headers=owner.headers,
    )

    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["event_type"] == "checklist"
    assert created["reminder_minutes_before"] == 30
    assert created["checklist_template"] == template["id"]

    update_response = await api_client.patch(
        f"/api/calendar-events/{created['id']}/",
        json={"reminder_minutes_before": 15, "checklist_template": None},
        headers=owner.headers,
    )

    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["reminder_minutes_before"] == 15
    assert updated["checklist_template"] is None


async def _create_template(api_client: AsyncClient, owner: AuthenticatedUser, name: str) -> dict:
    response = await api_client.post("/api/checklists/", json={"name": name}, headers=owner.headers)
    assert response.status_code == 201, response.text
    return response.json()


async def _add_notification_sequence(
    db_session_factory: async_sessionmaker[AsyncSession],
    rule_id: int,
) -> None:
    async with db_session_factory() as session:
        session.add(
            NotificationSequence(
                notification_rule_id=rule_id,
                sequence_order=1,
                trigger_offset_minutes=-60,
                recipient_type="custom",
                custom_email="ops@example.test",
            )
        )
        await session.commit()
