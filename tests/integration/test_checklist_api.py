import pytest
from rest_framework import status

from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    ChecklistVersionFactory,
    ChecklistItemFactory,
    TagFactory,
    FolderFactory,
)
from apps.checklists.services import ChecklistService


@pytest.mark.django_db
class TestChecklistTemplateViewSet:
    def test_list_checklists(self, authenticated_client, user):
        ChecklistTemplateFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/checklists/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3
        assert len(response.data["results"]) == 3

    def test_list_excludes_other_users(self, authenticated_client, user):
        ChecklistTemplateFactory.create_batch(2, user=user)
        other = UserFactory()
        ChecklistTemplateFactory.create_batch(3, user=other)
        response = authenticated_client.get("/api/v1/checklists/")
        assert response.data["count"] == 2

    def test_list_excludes_soft_deleted(self, authenticated_client, user):
        t1 = ChecklistTemplateFactory(user=user)
        t2 = ChecklistTemplateFactory(user=user)
        t2.soft_delete()
        response = authenticated_client.get("/api/v1/checklists/")
        assert response.data["count"] == 1

    def test_create_checklist(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/checklists/",
            {"title": "My Checklist", "description": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "My Checklist"

    def test_create_sets_user(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/checklists/",
            {"title": "Test"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_checklist(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(template)
        response = authenticated_client.get(f"/api/v1/checklists/{template.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == template.name

    def test_update_checklist(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        response = authenticated_client.patch(
            f"/api/v1/checklists/{template.id}/",
            {"title": "Updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated"

    def test_delete_checklist_soft_deletes(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        response = authenticated_client.delete(f"/api/v1/checklists/{template.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        template.refresh_from_db()
        assert template.is_deleted is True

    def test_duplicate_checklist(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(template)
        response = authenticated_client.post(
            f"/api/v1/checklists/{template.id}/duplicate/",
            {"name": "Copy"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Copy"

    def test_toggle_favorite(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user, is_favorite=False)
        response = authenticated_client.post(
            f"/api/v1/checklists/{template.id}/toggle_favorite/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_favorite"] is True

    def test_favorites_list(self, authenticated_client, user):
        ChecklistTemplateFactory(user=user, is_favorite=True)
        ChecklistTemplateFactory(user=user, is_favorite=False)
        response = authenticated_client.get("/api/v1/checklists/favorites/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_deleted_list(self, authenticated_client, user):
        t1 = ChecklistTemplateFactory(user=user)
        t2 = ChecklistTemplateFactory(user=user)
        t2.soft_delete()
        response = authenticated_client.get("/api/v1/checklists/deleted/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_restore_checklist_via_deleted_list(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        template.soft_delete()
        # Verify it appears in deleted list
        response = authenticated_client.get("/api/v1/checklists/deleted/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        # Restore via direct model (restore endpoint requires object lookup)
        template.restore()
        template.refresh_from_db()
        assert template.is_deleted is False

    def test_stats(self, authenticated_client, user):
        ChecklistTemplateFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/checklists/stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_checklists"] == 3


@pytest.mark.django_db
class TestBulkOperations:
    def test_bulk_delete(self, authenticated_client, user):
        templates = ChecklistTemplateFactory.create_batch(3, user=user)
        ids = [t.id for t in templates]

        response = authenticated_client.post(
            "/api/v1/checklists/bulk_delete/",
            {"ids": ids},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted_count"] == 3

        from apps.checklists.models import ChecklistTemplate
        for t in ChecklistTemplate.objects.filter(id__in=ids):
            assert t.is_deleted is True

    def test_bulk_delete_empty_ids(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/checklists/bulk_delete/",
            {"ids": []},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_move_folder(self, authenticated_client, user):
        folder = FolderFactory(user=user)
        templates = ChecklistTemplateFactory.create_batch(3, user=user)
        ids = [t.id for t in templates]

        response = authenticated_client.post(
            "/api/v1/checklists/bulk_move_folder/",
            {"ids": ids, "folder_id": folder.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated_count"] == 3

        from apps.checklists.models import ChecklistTemplate
        for t in ChecklistTemplate.objects.filter(id__in=ids):
            assert t.folder_id == folder.id

    def test_bulk_assign_tags(self, authenticated_client, user):
        templates = ChecklistTemplateFactory.create_batch(2, user=user)
        ids = [t.id for t in templates]

        response = authenticated_client.post(
            "/api/v1/checklists/bulk_assign_tags/",
            {"ids": ids, "tag_names": ["urgent", "review"]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["tags_added"] == 2

        from apps.checklists.models import ChecklistTemplate
        for t in ChecklistTemplate.objects.filter(id__in=ids):
            assert t.tags.count() == 2

    def test_bulk_operations_scoped_to_user(self, authenticated_client, user):
        other = UserFactory()
        other_template = ChecklistTemplateFactory(user=other)

        response = authenticated_client.post(
            "/api/v1/checklists/bulk_delete/",
            {"ids": [other_template.id]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["deleted_count"] == 0

        other_template.refresh_from_db()
        assert other_template.is_deleted is False
