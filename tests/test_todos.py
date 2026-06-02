"""Todo list and item lifecycle tests."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from checkix.models.todo import TodoList
from tests.conftest import AuthenticatedUser

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("clean_database")]


async def test_todo_list_items_bulk_complete_soft_delete_and_restore(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[[str], Awaitable[AuthenticatedUser]],
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    owner = await authenticated_user_factory("todo-owner")
    todo_list = await _create_todo_list(api_client, owner, "Launch tasks")
    first_item = await _create_todo_item(api_client, owner, todo_list["id"], "Prepare checklist")
    second_item = await _create_todo_item(api_client, owner, todo_list["id"], "Notify team")

    bulk_response = await api_client.post(
        f"/api/todos/{todo_list['id']}/items/bulk_complete/",
        json=[first_item["id"]],
        headers=owner.headers,
    )
    items_response = await api_client.get(f"/api/todos/{todo_list['id']}/items/", headers=owner.headers)
    delete_response = await api_client.delete(f"/api/todos/{todo_list['id']}/", headers=owner.headers)
    deleted_list_response = await api_client.get("/api/todos/", headers=owner.headers)
    deleted_get_response = await api_client.get(f"/api/todos/{todo_list['id']}/", headers=owner.headers)

    assert bulk_response.status_code == 200, bulk_response.text
    assert bulk_response.json()[0]["status"] == "completed"
    assert {item["status"] for item in items_response.json()} == {"completed", "pending"}
    assert delete_response.status_code == 200, delete_response.text
    assert deleted_list_response.json()["total"] == 0
    assert deleted_get_response.status_code == 404
    await _assert_todo_list_deleted(db_session_factory, todo_list["id"], expected=True)

    restore_response = await api_client.post(f"/api/todos/{todo_list['id']}/restore/", headers=owner.headers)
    restored_list_response = await api_client.get("/api/todos/", headers=owner.headers)

    assert restore_response.status_code == 200, restore_response.text
    assert restored_list_response.json()["total"] == 1
    assert second_item["status"] == "pending"
    await _assert_todo_list_deleted(db_session_factory, todo_list["id"], expected=False)


async def test_todo_lists_and_items_are_isolated_between_users(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[[str], Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("todo-isolation-owner")
    outsider = await authenticated_user_factory("todo-isolation-outsider")
    todo_list = await _create_todo_list(api_client, owner, "Private tasks")
    item = await _create_todo_item(api_client, owner, todo_list["id"], "Private item")

    outsider_get = await api_client.get(f"/api/todos/{todo_list['id']}/", headers=outsider.headers)
    outsider_items = await api_client.get(f"/api/todos/{todo_list['id']}/items/", headers=outsider.headers)
    outsider_item_update = await api_client.put(
        f"/api/todos/{todo_list['id']}/items/{item['id']}/",
        json={"status": "completed"},
        headers=outsider.headers,
    )
    outsider_list = await api_client.get("/api/todos/", headers=outsider.headers)

    assert outsider_get.status_code == 404
    assert outsider_items.status_code == 404
    assert outsider_item_update.status_code == 404
    assert outsider_list.json()["total"] == 0


async def test_bulk_complete_does_not_return_foreign_item_ids(
    api_client: AsyncClient,
    authenticated_user_factory: Callable[[str], Awaitable[AuthenticatedUser]],
) -> None:
    owner = await authenticated_user_factory("bulk-owner")
    outsider = await authenticated_user_factory("bulk-outsider")
    owner_list = await _create_todo_list(api_client, owner, "Owner tasks")
    outsider_list = await _create_todo_list(api_client, outsider, "Outsider tasks")
    owner_item = await _create_todo_item(api_client, owner, owner_list["id"], "Allowed item")
    outsider_item = await _create_todo_item(api_client, outsider, outsider_list["id"], "Foreign item")

    response = await api_client.post(
        f"/api/todos/{owner_list['id']}/items/bulk_complete/",
        json=[owner_item["id"], outsider_item["id"]],
        headers=owner.headers,
    )
    outsider_items = await api_client.get(
        f"/api/todos/{outsider_list['id']}/items/",
        headers=outsider.headers,
    )

    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [owner_item["id"]]
    assert outsider_items.json()[0]["status"] == "pending"


async def _create_todo_list(api_client: AsyncClient, owner: AuthenticatedUser, name: str) -> dict:
    response = await api_client.post(
        "/api/todos/",
        json={"name": name, "priority": "high"},
        headers=owner.headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _create_todo_item(
    api_client: AsyncClient,
    owner: AuthenticatedUser,
    todo_list_id: int,
    title: str,
) -> dict:
    response = await api_client.post(
        f"/api/todos/{todo_list_id}/items/",
        json={"title": title},
        headers=owner.headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _assert_todo_list_deleted(
    db_session_factory: async_sessionmaker[AsyncSession],
    todo_list_id: int,
    *,
    expected: bool,
) -> None:
    async with db_session_factory() as session:
        todo_list = await session.get(TodoList, todo_list_id)
        assert todo_list is not None
        assert todo_list.is_deleted is expected
        assert (todo_list.deleted_at is not None) is expected
