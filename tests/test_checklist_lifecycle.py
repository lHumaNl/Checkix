"""Checklist template lifecycle and ownership tests."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from checkix.models.checklist import ChecklistTemplate, ChecklistVersion
from tests.conftest import AuthenticatedUser

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("clean_database")]


async def test_checklist_template_soft_delete_restore_and_owner_isolation(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[[str], Awaitable[AuthenticatedUser]],
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    owner = await authenticated_user_factory("template-owner")
    outsider = await authenticated_user_factory("template-outsider")
    template = await _create_template(api_client, owner, "Daily safety check")

    outsider_response = await api_client.get(
        f"/api/checklists/{template['id']}/",
        headers=outsider.headers,
    )
    delete_response = await api_client.delete(
        f"/api/checklists/{template['id']}/",
        headers=owner.headers,
    )
    deleted_list = await api_client.get("/api/checklists/", headers=owner.headers)
    deleted_get = await api_client.get(
        f"/api/checklists/{template['id']}/",
        headers=owner.headers,
    )

    assert outsider_response.status_code == 404
    assert delete_response.status_code == 200, delete_response.text
    assert deleted_list.json()["total"] == 0
    assert deleted_get.status_code == 404
    await _assert_template_deleted(db_session_factory, template["id"], expected=True)

    outsider_restore = await api_client.post(
        f"/api/checklists/{template['id']}/restore/",
        headers=outsider.headers,
    )
    restore_response = await api_client.post(
        f"/api/checklists/{template['id']}/restore/",
        headers=owner.headers,
    )
    restored_list = await api_client.get("/api/checklists/", headers=owner.headers)

    assert outsider_restore.status_code == 404
    assert restore_response.status_code == 200, restore_response.text
    assert restored_list.json()["total"] == 1
    await _assert_template_deleted(db_session_factory, template["id"], expected=False)


async def test_checklist_versions_increment_and_deactivate_previous_versions(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[[str], Awaitable[AuthenticatedUser]],
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    owner = await authenticated_user_factory("version-owner")
    template = await _create_template(api_client, owner, "Versioned check")

    response = await api_client.post(
        f"/api/checklists/{template['id']}/versions/",
        json={"changelog": "Add required review"},
        headers=owner.headers,
    )

    assert response.status_code == 201, response.text
    new_version = response.json()
    assert new_version["version_number"] == 2
    assert new_version["is_active"] is True
    await _assert_template_current_version(db_session_factory, template["id"], new_version["id"])
    await _assert_version_active_states(db_session_factory, template["id"], {1: False, 2: True})


async def test_checklist_items_are_nested_and_cannot_be_modified_by_other_users(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[[str], Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("item-owner")
    outsider = await authenticated_user_factory("item-outsider")
    template = await _create_template(api_client, owner, "Nested check")
    version_id = template["current_version"]

    item_response = await api_client.post(
        f"/api/checklists/{template['id']}/versions/{version_id}/items/",
        json={"title": "Inspect room", "children": [{"title": "Check door"}]},
        headers=owner.headers,
    )
    outsider_response = await api_client.post(
        f"/api/checklists/{template['id']}/versions/{version_id}/items/",
        json={"title": "Unauthorized item"},
        headers=outsider.headers,
    )
    list_response = await api_client.get(
        f"/api/checklists/{template['id']}/versions/{version_id}/items/",
        headers=owner.headers,
    )

    assert item_response.status_code == 201, item_response.text
    assert outsider_response.status_code == 404
    assert list_response.status_code == 200, list_response.text
    assert list_response.json()[0]["children"][0]["title"] == "Check door"


async def _create_template(
    api_client: AsyncClient,
    user: AuthenticatedUser,
    name: str,
) -> dict:
    response = await api_client.post(
        "/api/checklists/",
        json={"name": name, "status": "draft", "sequential_mode": True},
        headers=user.headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["current_version"] is not None
    return body


async def _assert_template_deleted(
    db_session_factory: async_sessionmaker[AsyncSession],
    template_id: int,
    *,
    expected: bool,
) -> None:
    async with db_session_factory() as session:
        template = await session.get(ChecklistTemplate, template_id)
        assert template is not None
        assert template.is_deleted is expected
        assert (template.deleted_at is not None) is expected


async def _assert_template_current_version(
    db_session_factory: async_sessionmaker[AsyncSession],
    template_id: int,
    version_id: int,
) -> None:
    async with db_session_factory() as session:
        template = await session.get(ChecklistTemplate, template_id)
        assert template is not None
        assert template.current_version_id == version_id


async def _assert_version_active_states(
    db_session_factory: async_sessionmaker[AsyncSession],
    template_id: int,
    expected: dict[int, bool],
) -> None:
    async with db_session_factory() as session:
        result = await session.execute(
            select(ChecklistVersion).where(ChecklistVersion.template_id == template_id)
        )
        actual = {version.version_number: version.is_active for version in result.scalars()}
        assert actual == expected
