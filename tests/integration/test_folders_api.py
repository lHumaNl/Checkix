import pytest
from rest_framework import status

from tests.factories import UserFactory, FolderFactory


@pytest.mark.django_db
class TestFolderViewSet:
    def test_list_folders(self, authenticated_client, user):
        FolderFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/folders/")
        assert response.status_code == status.HTTP_200_OK

    def test_list_excludes_other_users(self, authenticated_client, user):
        FolderFactory.create_batch(2, user=user)
        other = UserFactory()
        FolderFactory.create_batch(3, user=other)
        response = authenticated_client.get("/api/v1/folders/")
        data = response.data
        count = data["count"] if isinstance(data, dict) else len(data)
        assert count == 2

    def test_create_folder(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/folders/",
            {"name": "Work"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Work"

    def test_create_subfolder(self, authenticated_client, user):
        parent = FolderFactory(user=user)
        response = authenticated_client.post(
            "/api/v1/folders/",
            {"name": "Subfolder", "parent": parent.id},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_update_folder(self, authenticated_client, user):
        folder = FolderFactory(user=user)
        response = authenticated_client.patch(
            f"/api/v1/folders/{folder.id}/",
            {"name": "Updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_delete_folder(self, authenticated_client, user):
        folder = FolderFactory(user=user)
        response = authenticated_client.delete(f"/api/v1/folders/{folder.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
