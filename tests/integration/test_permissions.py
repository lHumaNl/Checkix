import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    TagFactory,
    FolderFactory,
    TodoListFactory,
    CalendarEventFactory,
)


@pytest.mark.django_db
class TestOwnerIsolation:
    """Test that users can only access their own resources."""

    def setup_method(self):
        self.user1 = UserFactory()
        self.user2 = UserFactory()

        self.client1 = APIClient()
        refresh1 = RefreshToken.for_user(self.user1)
        self.client1.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh1.access_token}"
        )

        self.client2 = APIClient()
        refresh2 = RefreshToken.for_user(self.user2)
        self.client2.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh2.access_token}"
        )

    def test_cannot_read_other_users_checklist(self):
        template = ChecklistTemplateFactory(user=self.user1)
        response = self.client2.get(f"/api/v1/checklists/{template.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_update_other_users_checklist(self):
        template = ChecklistTemplateFactory(user=self.user1)
        response = self.client2.patch(
            f"/api/v1/checklists/{template.id}/",
            {"name": "Hacked"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_delete_other_users_checklist(self):
        template = ChecklistTemplateFactory(user=self.user1)
        response = self.client2.delete(f"/api/v1/checklists/{template.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_read_other_users_tag(self):
        tag = TagFactory(user=self.user1)
        response = self.client2.get(f"/api/v1/tags/{tag.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_read_other_users_folder(self):
        folder = FolderFactory(user=self.user1)
        response = self.client2.get(f"/api/v1/folders/{folder.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_read_other_users_todo(self):
        todo = TodoListFactory(user=self.user1)
        response = self.client2.get(f"/api/v1/todos/{todo.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_read_other_users_calendar_event(self):
        event = CalendarEventFactory(user=self.user1)
        response = self.client2.get(f"/api/v1/calendar/events/{event.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestUnauthenticatedAccess:
    """Test that unauthenticated users cannot access protected endpoints."""

    def test_checklists_require_auth(self):
        client = APIClient()
        response = client.get("/api/v1/checklists/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tags_require_auth(self):
        client = APIClient()
        response = client.get("/api/v1/tags/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_folders_require_auth(self):
        client = APIClient()
        response = client.get("/api/v1/folders/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_instances_require_auth(self):
        client = APIClient()
        response = client.get("/api/v1/checklist-instances/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_todos_require_auth(self):
        client = APIClient()
        response = client.get("/api/v1/todos/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_calendar_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/calendar/events/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_stats_require_auth(self):
        client = APIClient()
        response = client.get("/api/v1/stats/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
