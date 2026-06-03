"""Checklist instance execution and run-link behavior tests."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from tests.conftest import AuthenticatedUser

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("clean_database")]


async def test_instance_lifecycle_copies_items_tracks_progress_and_logs_actions(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("instance-owner")
    template = await _template_with_items(api_client, owner)
    instance = await _create_instance(api_client, owner, template["id"])

    initial_items = await _get_items(api_client, owner, instance["id"])
    toggle_before_start = await api_client.post(
        f"/api/instances/{instance['id']}/items/{initial_items[0]['id']}/toggle/",
        headers=owner.headers,
    )
    start_response = await api_client.post(f"/api/instances/{instance['id']}/start/", headers=owner.headers)
    toggle_response = await api_client.post(
        f"/api/instances/{instance['id']}/items/{initial_items[0]['id']}/toggle/",
        headers=owner.headers,
    )
    refreshed_instance = await api_client.get(f"/api/instances/{instance['id']}/", headers=owner.headers)
    complete_response = await api_client.post(f"/api/instances/{instance['id']}/complete/", headers=owner.headers)
    cancel_after_complete = await api_client.post(f"/api/instances/{instance['id']}/cancel/", headers=owner.headers)
    logs_response = await api_client.get(f"/api/instances/{instance['id']}/logs/", headers=owner.headers)

    assert len(initial_items) == 2
    assert toggle_before_start.status_code == 400
    assert start_response.json()["status"] == "in_progress"
    assert toggle_response.json()["is_completed"] is True
    assert refreshed_instance.json()["progress_percentage"] == 50
    assert complete_response.json()["status"] == "completed"
    assert complete_response.json()["progress_percentage"] == 100
    assert cancel_after_complete.status_code == 400
    assert {log["action"] for log in logs_response.json()} >= {"status:in_progress", "item:completed", "status:completed"}


async def test_instances_are_isolated_between_users(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("owned-instance-user")
    outsider = await authenticated_user_factory("foreign-instance-user")
    template = await _template_with_items(api_client, owner)
    instance = await _create_instance(api_client, owner, template["id"])

    outsider_get = await api_client.get(f"/api/instances/{instance['id']}/", headers=outsider.headers)
    outsider_list = await api_client.get("/api/instances/", headers=outsider.headers)
    outsider_create = await api_client.post(
        "/api/instances/",
        json={"template_id": template["id"]},
        headers=outsider.headers,
    )

    assert outsider_get.status_code == 404
    assert outsider_list.json()["total"] == 0
    assert outsider_create.status_code == 404


async def test_run_links_enforce_ownership_and_public_usage_limits(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("link-owner", is_staff=True)
    outsider = await authenticated_user_factory("link-outsider", is_staff=True)
    template = await _create_template(api_client, owner, "Shareable check")

    link_response = await api_client.post(
        "/api/run-links/",
        json={"template_id": template["id"], "name": "Public run", "max_uses": 1},
        headers=owner.headers,
    )
    link = link_response.json()
    token = link["token"]
    outsider_create = await api_client.post(
        "/api/run-links/",
        json={"template_id": template["id"], "name": "Foreign link"},
        headers=outsider.headers,
    )
    public_get = await api_client.get(f"/api/run-links/execute/{token}/")
    first_execute = await api_client.post(f"/api/run-links/execute/{token}/")
    second_execute = await api_client.post(f"/api/run-links/execute/{token}/")
    owner_list = await api_client.get("/api/run-links/", headers=owner.headers)
    outsider_list = await api_client.get("/api/run-links/", headers=outsider.headers)
    outsider_delete = await api_client.delete(f"/api/run-links/{link['id']}/", headers=outsider.headers)

    assert link_response.status_code == 201, link_response.text
    assert outsider_create.status_code == 404
    assert public_get.status_code == 200, public_get.text
    assert first_execute.status_code == 200, first_execute.text
    assert second_execute.status_code == 404
    assert owner_list.json()["total"] == 1
    assert owner_list.json()["items"][0]["usage_count"] == 1
    assert outsider_list.json()["total"] == 0
    assert outsider_delete.status_code == 404


async def test_expired_run_link_cannot_be_executed(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[..., Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("expired-link-owner", is_staff=True)
    template = await _create_template(api_client, owner, "Expired link check")
    expires_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()

    link_response = await api_client.post(
        "/api/run-links/",
        json={"template_id": template["id"], "expires_at": expires_at},
        headers=owner.headers,
    )
    execute_response = await api_client.post(
        f"/api/run-links/execute/{link_response.json()['token']}/"
    )

    assert link_response.status_code == 201, link_response.text
    assert execute_response.status_code == 404


async def _template_with_items(api_client: AsyncClient, owner: AuthenticatedUser) -> dict:
    template = await _create_template(api_client, owner, "Executable check")
    version_id = template["current_version"]
    for title in ("First step", "Second step"):
        response = await api_client.post(
            f"/api/checklists/{template['id']}/versions/{version_id}/items/",
            json={"title": title},
            headers=owner.headers,
        )
        assert response.status_code == 201, response.text
    return template


async def _create_template(api_client: AsyncClient, owner: AuthenticatedUser, name: str) -> dict:
    response = await api_client.post("/api/checklists/", json={"name": name}, headers=owner.headers)
    assert response.status_code == 201, response.text
    return response.json()


async def _create_instance(api_client: AsyncClient, owner: AuthenticatedUser, template_id: int) -> dict:
    response = await api_client.post("/api/instances/", json={"template_id": template_id}, headers=owner.headers)
    assert response.status_code == 201, response.text
    return response.json()


async def _get_items(api_client: AsyncClient, owner: AuthenticatedUser, instance_id: int) -> list[dict]:
    response = await api_client.get(f"/api/instances/{instance_id}/items/", headers=owner.headers)
    assert response.status_code == 200, response.text
    return response.json()
