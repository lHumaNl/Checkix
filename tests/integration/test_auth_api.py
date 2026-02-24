import pytest
from django.contrib.auth.models import User
from rest_framework import status


@pytest.mark.django_db
class TestAuthAPI:
    def test_obtain_token_success(self, api_client, user):
        response = api_client.post(
            "/api/v1/auth/token/",
            {"username": "testuser", "password": "testpass123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_obtain_token_invalid_credentials(self, api_client, user):
        response = api_client.post(
            "/api/v1/auth/token/",
            {"username": "testuser", "password": "wrongpassword"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_obtain_token_nonexistent_user(self, api_client):
        response = api_client.post(
            "/api/v1/auth/token/",
            {"username": "nonexistent", "password": "anypassword"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_success(self, api_client, user, refresh_token):
        response = api_client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": refresh_token},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_token_invalid(self, api_client):
        response = api_client.post(
            "/api/v1/auth/token/refresh/",
            {"refresh": "invalid_token"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_verify_token_success(self, api_client, access_token):
        response = api_client.post(
            "/api/v1/auth/token/verify/",
            {"token": access_token},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_verify_token_invalid(self, api_client):
        response = api_client.post(
            "/api/v1/auth/token/verify/",
            {"token": "invalid_token"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestProtectedEndpoints:
    def test_authenticated_request_success(self, authenticated_client):
        response = authenticated_client.get("/api/v1/users/me/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "testuser"

    def test_unauthenticated_request_fails(self, api_client):
        response = api_client.get("/api/v1/users/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_expired_token_fails(self, api_client):
        api_client.credentials(HTTP_AUTHORIZATION="Bearer invalid_token")
        response = api_client.get("/api/v1/users/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_auth_header_fails(self, api_client):
        response = api_client.get("/api/v1/users/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
