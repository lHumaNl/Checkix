import pytest
from unittest.mock import patch, MagicMock

from rest_framework import status

from tests.factories import UserFactory
from apps.ldap.models import LDAPSyncLog


@pytest.mark.django_db
class TestLDAPSyncLogViewSet:
    def test_list_sync_logs_admin_only(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/ldap/logs/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_sync_logs_as_admin(self, admin_client, admin_user):
        LDAPSyncLog.objects.create(status='success', users_synced=10)
        LDAPSyncLog.objects.create(status='failed', error_message='Test error')
        
        response = admin_client.get('/api/v1/ldap/logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_retrieve_sync_log_admin_only(self, authenticated_client, user):
        log = LDAPSyncLog.objects.create(status='success')
        
        response = authenticated_client.get(f'/api/v1/ldap/logs/{log.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_sync_log_as_admin(self, admin_client, admin_user):
        log = LDAPSyncLog.objects.create(status='success', users_synced=10)
        
        response = admin_client.get(f'/api/v1/ldap/logs/{log.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == log.id


@pytest.mark.django_db
class TestLDAPManagementViewSet:
    def test_test_connection_admin_only(self, authenticated_client, user):
        response = authenticated_client.post('/api/v1/ldap/manage/test_connection/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_test_connection_as_admin(self, admin_client, admin_user):
        with patch('apps.ldap.backends.LDAPService.test_connection') as mock_test:
            mock_test.return_value = {
                'success': True,
                'server_reachable': True,
                'bind_successful': True,
                'base_dn_accessible': True,
                'user_count': 10,
                'group_count': 5,
                'error_message': None,
            }
            response = admin_client.post('/api/v1/ldap/manage/test_connection/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True

    def test_test_connection_not_configured(self, admin_client, admin_user):
        with patch('apps.ldap.backends.LDAPService.test_connection') as mock_test:
            mock_test.return_value = {
                'success': False,
                'server_reachable': False,
                'bind_successful': False,
                'base_dn_accessible': False,
                'user_count': None,
                'group_count': None,
                'error_message': 'LDAP not configured',
            }
            response = admin_client.post('/api/v1/ldap/manage/test_connection/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is False
        assert 'not configured' in response.data['error_message']

    def test_sync_users_admin_only(self, authenticated_client, user):
        response = authenticated_client.post('/api/v1/ldap/manage/sync_users/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_sync_users_as_admin(self, admin_client, admin_user):
        with patch('apps.ldap.backends.LDAPService.sync_users') as mock_sync:
            mock_sync.return_value = {
                'success': True,
                'users_synced': 10,
                'users_created': 3,
                'users_updated': 7,
                'error_message': None,
            }
            response = admin_client.post('/api/v1/ldap/manage/sync_users/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['users_synced'] == 10

    def test_sync_users_failure(self, admin_client, admin_user):
        with patch('apps.ldap.backends.LDAPService.sync_users') as mock_sync:
            mock_sync.return_value = {
                'success': False,
                'users_synced': 0,
                'users_created': 0,
                'users_updated': 0,
                'error_message': 'Connection refused',
            }
            response = admin_client.post('/api/v1/ldap/manage/sync_users/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is False

    def test_stats_admin_only(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/ldap/manage/stats/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_stats_as_admin(self, admin_client, admin_user):
        LDAPSyncLog.objects.create(status='success', users_synced=10)
        LDAPSyncLog.objects.create(status='failed', error_message='Error')
        
        with patch('apps.ldap.backends.LDAPService.get_stats') as mock_stats:
            mock_stats.return_value = {
                'configured': True,
                'total_syncs': 2,
                'successful_syncs': 1,
                'failed_syncs': 1,
                'success_rate': 50.0,
                'last_sync_at': None,
                'last_sync_status': 'failed',
            }
            response = admin_client.get('/api/v1/ldap/manage/stats/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['configured'] is True
        assert response.data['total_syncs'] == 2


@pytest.mark.django_db
class TestLDAPSyncLogModel:
    def test_duration_seconds_when_completed(self):
        from django.utils import timezone
        from datetime import timedelta
        
        log = LDAPSyncLog.objects.create(
            status='success',
            started_at=timezone.now() - timedelta(minutes=5),
        )
        log.completed_at = timezone.now()
        log.save()
        
        assert log.duration_seconds is not None
        assert log.duration_seconds > 0

    def test_duration_seconds_when_not_completed(self):
        log = LDAPSyncLog.objects.create(status='success')
        
        assert log.duration_seconds is None

    def test_str_representation(self):
        log = LDAPSyncLog.objects.create(status='success')
        
        assert 'success' in str(log)


@pytest.mark.django_db
class TestLDAPService:
    def test_get_stats_no_syncs(self):
        from apps.ldap.backends import LDAPService
        
        with patch('django.conf.settings.AUTH_LDAP_SERVER_URI', 'ldap://localhost'):
            stats = LDAPService.get_stats()
        
        assert stats['total_syncs'] == 0
        assert stats['success_rate'] == 0

    def test_get_stats_with_syncs(self):
        from apps.ldap.backends import LDAPService
        
        LDAPSyncLog.objects.create(status='success', users_synced=10)
        LDAPSyncLog.objects.create(status='success', users_synced=5)
        LDAPSyncLog.objects.create(status='failed', error_message='Error')
        
        with patch('django.conf.settings.AUTH_LDAP_SERVER_URI', 'ldap://localhost'):
            stats = LDAPService.get_stats()
        
        assert stats['total_syncs'] == 3
        assert stats['successful_syncs'] == 2
        assert stats['failed_syncs'] == 1
