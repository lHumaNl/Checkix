import pytest
from rest_framework import status

from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    ChecklistVersionFactory,
    ChecklistInstanceFactory,
    ChecklistItemInstanceFactory,
)
from apps.checklists.services import ChecklistService


@pytest.mark.django_db
class TestChecklistInstanceViewSet:
    def test_list_instances(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        ChecklistInstanceFactory.create_batch(3, user=user, template=template, version=version)
        response = authenticated_client.get("/api/v1/checklist-instances/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3

    def test_list_excludes_other_users(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        ChecklistInstanceFactory.create_batch(2, user=user, template=template, version=version)
        other = UserFactory()
        other_template = ChecklistTemplateFactory(user=other)
        other_version = ChecklistVersionFactory(template=other_template)
        ChecklistInstanceFactory.create_batch(3, user=other, template=other_template, version=other_version)
        response = authenticated_client.get("/api/v1/checklist-instances/")
        assert response.data["count"] == 2

    def test_start_instance(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        instance = ChecklistInstanceFactory(user=user, template=template, version=version, status="draft")
        response = authenticated_client.post(
            f"/api/v1/checklist-instances/{instance.id}/start/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "in_progress"

    def test_start_rejects_completed(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        instance = ChecklistInstanceFactory(user=user, template=template, version=version, status="completed")
        response = authenticated_client.post(
            f"/api/v1/checklist-instances/{instance.id}/start/"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_complete_instance(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        instance = ChecklistInstanceFactory(user=user, template=template, version=version, status="in_progress")
        response = authenticated_client.post(
            f"/api/v1/checklist-instances/{instance.id}/complete/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "completed"

    def test_cancel_instance(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        instance = ChecklistInstanceFactory(user=user, template=template, version=version, status="in_progress")
        response = authenticated_client.post(
            f"/api/v1/checklist-instances/{instance.id}/cancel/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "cancelled"

    def test_cancel_rejects_completed(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        instance = ChecklistInstanceFactory(user=user, template=template, version=version, status="completed")
        response = authenticated_client.post(
            f"/api/v1/checklist-instances/{instance.id}/cancel/"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_pause_instance(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        instance = ChecklistInstanceFactory(user=user, template=template, version=version, status="in_progress")
        response = authenticated_client.post(
            f"/api/v1/checklist-instances/{instance.id}/pause/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "paused"

    def test_stats(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistVersionFactory(template=template)
        ChecklistInstanceFactory(user=user, template=template, version=version, status="draft")
        ChecklistInstanceFactory(user=user, template=template, version=version, status="completed")
        response = authenticated_client.get("/api/v1/checklist-instances/stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 2

    def test_from_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(
            template,
            items_data=[{"title": "Step 1"}, {"title": "Step 2"}],
        )
        response = authenticated_client.post(
            "/api/v1/checklist-instances/from_template/",
            {"template_id": str(template.id), "name": "Run 1"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Run 1"
