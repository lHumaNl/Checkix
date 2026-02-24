import pytest
from rest_framework import status

from tests.factories import UserFactory, TagFactory


@pytest.mark.django_db
class TestTagViewSet:
    def test_list_tags(self, authenticated_client, user):
        TagFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/tags/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_list_excludes_other_users(self, authenticated_client, user):
        TagFactory.create_batch(2, user=user)
        other = UserFactory()
        TagFactory.create_batch(3, user=other)
        response = authenticated_client.get("/api/v1/tags/")
        assert response.data["count"] == 2

    def test_create_tag(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/tags/",
            {"name": "urgent", "color": "#ff0000"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "urgent"

    def test_update_tag(self, authenticated_client, user):
        tag = TagFactory(user=user)
        response = authenticated_client.patch(
            f"/api/v1/tags/{tag.id}/",
            {"name": "updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "updated"

    def test_delete_tag(self, authenticated_client, user):
        tag = TagFactory(user=user)
        response = authenticated_client.delete(f"/api/v1/tags/{tag.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_stats(self, authenticated_client, user):
        TagFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/tags/stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_tags"] == 3

    def test_bulk_create(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/tags/bulk_create/",
            [
                {"name": "tag1", "color": "#ff0000"},
                {"name": "tag2", "color": "#00ff00"},
            ],
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2

    def test_bulk_delete(self, authenticated_client, user):
        tags = TagFactory.create_batch(3, user=user)
        ids = [str(t.id) for t in tags]
        response = authenticated_client.post(
            "/api/v1/tags/bulk_delete/",
            {"ids": ids},
            format="json",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_by_name(self, authenticated_client, user):
        TagFactory(user=user, name="deployment")
        TagFactory(user=user, name="review")
        response = authenticated_client.get("/api/v1/tags/?name=deployment")
        assert response.data["count"] == 1
