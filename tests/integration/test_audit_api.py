import pytest
from datetime import timedelta
from django.utils import timezone

from rest_framework import status

from tests.factories import (
    UserFactory,
    ChecklistInstanceFactory,
)
from apps.audit.models import AuditLog


@pytest.mark.django_db
class TestAuditLogViewSet:
    def test_list_audit_logs(self, authenticated_client, user):
        for _ in range(3):
            AuditLog.objects.create(
                user=user,
                action='created',
                entity_type='checklist_template',
                entity_id=1,
                entity_name='Test',
            )
        
        response = authenticated_client.get('/api/v1/audit/logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_audit_logs_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        for _ in range(2):
            AuditLog.objects.create(
                user=user,
                action='created',
                entity_type='checklist_template',
                entity_id=1,
                entity_name='Test',
            )
        for _ in range(3):
            AuditLog.objects.create(
                user=other_user,
                action='created',
                entity_type='checklist_template',
                entity_id=2,
                entity_name='Other',
            )
        
        response = authenticated_client.get('/api/v1/audit/logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_retrieve_audit_log(self, authenticated_client, user):
        log = AuditLog.objects.create(
            user=user,
            action='created',
            entity_type='checklist_template',
            entity_id=1,
            entity_name='Test',
        )
        
        response = authenticated_client.get(f'/api/v1/audit/logs/{log.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == log.id

    def test_cannot_access_other_users_log(self, authenticated_client, user):
        other_user = UserFactory()
        log = AuditLog.objects.create(
            user=other_user,
            action='created',
            entity_type='checklist_template',
            entity_id=1,
            entity_name='Test',
        )
        
        response = authenticated_client.get(f'/api/v1/audit/logs/{log.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_summary_action(self, authenticated_client, user):
        for i in range(5):
            AuditLog.objects.create(
                user=user,
                action='created',
                entity_type='checklist_template',
                entity_id=i,
                entity_name=f'Test {i}',
            )
        
        response = authenticated_client.get('/api/v1/audit/logs/summary/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_logs'] == 5

    def test_summary_action_with_days_param(self, authenticated_client, user):
        old_log = AuditLog.objects.create(
            user=user,
            action='created',
            entity_type='checklist_template',
            entity_id=1,
            entity_name='Old',
        )
        old_log.created_at = timezone.now() - timedelta(days=100)
        old_log.save()
        
        AuditLog.objects.create(
            user=user,
            action='created',
            entity_type='checklist_template',
            entity_id=2,
            entity_name='Recent',
        )
        
        response = authenticated_client.get('/api/v1/audit/logs/summary/?days=30')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_logs'] == 1

    def test_summary_invalid_days(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/audit/logs/summary/?days=invalid')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_by_entity_action(self, authenticated_client, user):
        for i in range(3):
            AuditLog.objects.create(
                user=user,
                action='updated',
                entity_type='checklist_template',
                entity_id=1,
                entity_name='Test',
            )
        AuditLog.objects.create(
            user=user,
            action='updated',
            entity_type='checklist_template',
            entity_id=2,
            entity_name='Other',
        )
        
        response = authenticated_client.get(
            '/api/v1/audit/logs/by_entity/?entity_type=checklist_template&entity_id=1'
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_by_entity_requires_params(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/audit/logs/by_entity/?entity_type=checklist_template')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_by_entity_invalid_entity_id(self, authenticated_client, user):
        response = authenticated_client.get(
            '/api/v1/audit/logs/by_entity/?entity_type=checklist_template&entity_id=invalid'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_by_user_action(self, authenticated_client, user):
        target_user = UserFactory()
        for i in range(3):
            AuditLog.objects.create(
                user=target_user,
                action='created',
                entity_type='checklist_template',
                entity_id=i,
                entity_name='Test',
            )
        
        response = authenticated_client.get(f'/api/v1/audit/logs/by_user/?user_id={target_user.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_by_user_requires_user_id(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/audit/logs/by_user/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_by_user_not_found(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/audit/logs/by_user/?user_id=99999')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_action_counts(self, authenticated_client, user):
        AuditLog.objects.create(
            user=user, action='created', entity_type='test', entity_id=1
        )
        AuditLog.objects.create(
            user=user, action='created', entity_type='test', entity_id=2
        )
        AuditLog.objects.create(
            user=user, action='updated', entity_type='test', entity_id=1
        )
        
        response = authenticated_client.get('/api/v1/audit/logs/action_counts/')
        assert response.status_code == status.HTTP_200_OK
        assert 'created' in response.data
        assert 'updated' in response.data

    def test_cleanup_admin_only(self, authenticated_client, user):
        response = authenticated_client.post('/api/v1/audit/logs/cleanup/', {'days': 90})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cleanup_as_admin(self, admin_client, admin_user):
        old_log = AuditLog.objects.create(
            user=admin_user,
            action='created',
            entity_type='test',
            entity_id=1,
        )
        old_log.created_at = timezone.now() - timedelta(days=100)
        old_log.save()
        
        AuditLog.objects.create(
            user=admin_user,
            action='created',
            entity_type='test',
            entity_id=2,
        )
        
        response = admin_client.post('/api/v1/audit/logs/cleanup/', {'days': 90}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['deleted_count'] >= 1


@pytest.mark.django_db
class TestAuditLogModel:
    def test_log_action_creates_log(self, user):
        log = AuditLog.log_action(
            user=user,
            action='created',
            entity_type='checklist_template',
            entity_id=1,
            entity_name='Test Template',
        )
        
        assert log.id is not None
        assert log.user == user
        assert log.action == 'created'
        assert log.entity_type == 'checklist_template'
        assert log.entity_id == 1

    def test_log_action_with_request(self, user, api_client):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get('/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        request.META['HTTP_USER_AGENT'] = 'TestAgent'
        
        log = AuditLog.log_action(
            user=user,
            action='created',
            entity_type='checklist_template',
            entity_id=1,
            request=request,
        )
        
        assert log.ip_address == '192.168.1.1'
        assert 'TestAgent' in log.user_agent

    def test_get_client_ip_with_forwarded_for(self, user):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '10.0.0.1, 192.168.1.1'
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        
        ip = AuditLog._get_client_ip(request)
        assert ip == '10.0.0.1'

    def test_get_client_ip_without_forwarded_for(self, user):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        request = factory.get('/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        
        ip = AuditLog._get_client_ip(request)
        assert ip == '192.168.1.1'
