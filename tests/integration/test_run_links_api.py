import pytest
from datetime import timedelta
from django.utils import timezone

from rest_framework import status

from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    RunLinkFactory,
)


@pytest.mark.django_db
class TestRunLinkViewSet:
    def test_list_run_links(self, authenticated_client, user):
        RunLinkFactory.create_batch(3, created_by=user)
        
        response = authenticated_client.get('/api/v1/run-links/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_run_links_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        RunLinkFactory.create_batch(2, created_by=user)
        RunLinkFactory.create_batch(3, created_by=other_user)
        
        response = authenticated_client.get('/api/v1/run-links/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_create_run_link(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/run-links/',
            {
                'checklist_template': template.id,
                'name': 'Test Link',
                'access_type': 'public',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Link'

    def test_create_sets_user(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/run-links/',
            {
                'checklist_template': template.id,
                'name': 'Test Link',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_run_link(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user)
        
        response = authenticated_client.get(f'/api/v1/run-links/{link.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == link.id

    def test_update_run_link(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user, name='Old Name')
        
        response = authenticated_client.patch(
            f'/api/v1/run-links/{link.id}/',
            {'name': 'New Name'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'New Name'

    def test_delete_run_link(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user)
        
        response = authenticated_client.delete(f'/api/v1/run-links/{link.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_execute_run_link_expired(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user, expires_at=timezone.now() - timedelta(hours=1))
        
        response = authenticated_client.post(f'/api/v1/run-links/{link.id}/execute/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expired' in response.data['error'].lower()

    def test_execute_run_link_max_uses_reached(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user, max_uses=1, usage_count=1)
        
        response = authenticated_client.post(f'/api/v1/run-links/{link.id}/execute/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'maximum usage' in response.data['error'].lower()

    def test_execute_run_link_by_uuid_expired(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user, expires_at=timezone.now() - timedelta(hours=1))
        
        response = authenticated_client.post(f'/api/v1/run-links/execute/{link.unique_id}/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_execute_run_link_by_uuid_not_found(self, authenticated_client, user):
        import uuid
        fake_uuid = str(uuid.uuid4())
        
        response = authenticated_client.post(f'/api/v1/run-links/execute/{fake_uuid}/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_stats_action(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user, usage_count=5, max_uses=10)
        
        response = authenticated_client.get(f'/api/v1/run-links/{link.id}/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['usage_count'] == 5
        assert response.data['remaining_uses'] == 5

    def test_regenerate_unique_id(self, authenticated_client, user):
        link = RunLinkFactory(created_by=user)
        old_uuid = link.unique_id
        
        response = authenticated_client.post(f'/api/v1/run-links/{link.id}/regenerate/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['unique_id'] != str(old_uuid)

    def test_valid_action(self, authenticated_client, user):
        RunLinkFactory(created_by=user, expires_at=None, max_uses=None)
        RunLinkFactory(created_by=user, expires_at=timezone.now() + timedelta(days=1), max_uses=None)
        RunLinkFactory(created_by=user, expires_at=timezone.now() - timedelta(days=1), max_uses=None)
        
        response = authenticated_client.get('/api/v1/run-links/valid/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_expired_action(self, authenticated_client, user):
        RunLinkFactory(created_by=user, expires_at=timezone.now() + timedelta(days=1))
        RunLinkFactory(created_by=user, expires_at=timezone.now() - timedelta(days=1))
        
        response = authenticated_client.get('/api/v1/run-links/expired/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_by_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        RunLinkFactory.create_batch(2, checklist_template=template, created_by=user)
        RunLinkFactory(created_by=user)
        
        response = authenticated_client.get(f'/api/v1/run-links/by_template/?template_id={template.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_by_template_requires_template_id(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/run-links/by_template/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cleanup_expired_admin_only(self, authenticated_client, user):
        response = authenticated_client.post('/api/v1/run-links/cleanup_expired/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cleanup_expired_as_admin(self, admin_client, admin_user):
        RunLinkFactory(expires_at=timezone.now() - timedelta(days=1))
        
        response = admin_client.post('/api/v1/run-links/cleanup_expired/')
        assert response.status_code == status.HTTP_200_OK

    def test_cannot_access_other_users_link(self, authenticated_client, user):
        other_user = UserFactory()
        link = RunLinkFactory(created_by=other_user)
        
        response = authenticated_client.get(f'/api/v1/run-links/{link.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_execute_increments_usage_count(self, authenticated_client, user):
        from unittest.mock import patch, MagicMock
        
        link = RunLinkFactory(created_by=user, max_uses=None)
        initial_count = link.usage_count
        
        mock_instance = MagicMock()
        mock_instance.id = 'test-id'
        
        with patch('apps.checklist_instances.services.ChecklistInstanceService.create_from_template') as mock_create:
            mock_create.return_value = mock_instance
            authenticated_client.post(f'/api/v1/run-links/{link.id}/execute/', {})
        
        link.refresh_from_db()
        assert link.usage_count == initial_count + 1
