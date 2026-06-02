"""Authentication and token security integration tests."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

import pytest
from httpx import AsyncClient

from checkix.models.user import User
from tests.conftest import TEST_PASSWORD

pytestmark = [pytest.mark.integration, pytest.mark.usefixtures("clean_database")]


async def test_login_issues_tokens_and_access_token_authenticates_user(
    api_client: AsyncClient,
    user_factory: Callable[..., Awaitable[User]],
) -> None:
    await user_factory("auth-user")

    token_response = await api_client.post(
        "/api/auth/token/",
        json={"username": "auth-user", "password": TEST_PASSWORD},
    )

    assert token_response.status_code == 200, token_response.text
    tokens = token_response.json()
    assert tokens["access"]
    assert tokens["refresh"]

    profile_response = await api_client.get(
        "/api/users/me/",
        headers={"Authorization": f"Bearer {tokens['access']}"},
    )
    assert profile_response.status_code == 200, profile_response.text
    assert profile_response.json()["username"] == "auth-user"


@pytest.mark.parametrize(
    ("username", "password", "is_active"),
    (("auth-user", "wrong-password", True), ("disabled-user", TEST_PASSWORD, False)),
)
async def test_login_rejects_invalid_credentials_and_disabled_accounts(
    api_client: AsyncClient,
    user_factory: Callable[..., Awaitable[User]],
    username: str,
    password: str,
    is_active: bool,
) -> None:
    await user_factory(username, is_active=is_active)

    response = await api_client.post(
        "/api/auth/token/",
        json={"username": username, "password": password},
    )

    assert response.status_code == 401


async def test_protected_endpoint_rejects_missing_and_tampered_tokens(
    api_client: AsyncClient,
) -> None:
    missing_response = await api_client.get("/api/users/me/")
    tampered_response = await api_client.get(
        "/api/users/me/",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )

    assert missing_response.status_code == 401
    assert tampered_response.status_code == 401


async def test_refresh_endpoint_only_accepts_refresh_tokens(
    api_client: AsyncClient,
    user_factory: Callable[..., Awaitable[User]],
) -> None:
    await user_factory("refresh-user")
    tokens = await _login(api_client, "refresh-user")

    invalid_refresh = await api_client.post(
        "/api/auth/token/refresh/",
        json={"refresh": tokens["access"]},
    )
    valid_refresh = await api_client.post(
        "/api/auth/token/refresh/",
        json={"refresh": tokens["refresh"]},
    )

    assert invalid_refresh.status_code == 401
    assert valid_refresh.status_code == 200, valid_refresh.text
    assert valid_refresh.json()["access"]
    assert valid_refresh.json()["refresh"]


async def test_protected_endpoint_rejects_refresh_tokens(
    api_client: AsyncClient,
    user_factory: Callable[..., Awaitable[User]],
) -> None:
    await user_factory("refresh-rejected-user")
    tokens = await _login(api_client, "refresh-rejected-user")

    response = await api_client.get(
        "/api/users/me/",
        headers={"Authorization": f"Bearer {tokens['refresh']}"},
    )

    assert response.status_code == 401


async def test_token_verify_reports_valid_and_invalid_tokens(
    api_client: AsyncClient,
    user_factory: Callable[..., Awaitable[User]],
) -> None:
    user = await user_factory("verify-user")
    tokens = await _login(api_client, "verify-user")

    valid_response = await api_client.post(
        "/api/auth/token/verify/",
        json={"refresh": tokens["refresh"]},
    )
    invalid_response = await api_client.post(
        "/api/auth/token/verify/",
        json={"refresh": "invalid-token"},
    )

    assert valid_response.status_code == 200, valid_response.text
    assert valid_response.json() == {"valid": True, "user_id": user.id, "token_type": "refresh"}
    assert invalid_response.status_code == 200, invalid_response.text
    assert invalid_response.json()["valid"] is False


async def _login(api_client: AsyncClient, username: str) -> dict[str, str]:
    response = await api_client.post(
        "/api/auth/token/",
        json={"username": username, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()
