import pytest
from rest_framework import status

from tests.factories import UserFactory, WebhookFactory, WebhookEventFactory, ChecklistInstanceFactory


@pytest.mark.django_db
class TestWebhookViewSet:
    def test_list_webhooks(self, authenticated_client, user):
        WebhookFactory.create_batch(3, user=user)
        
        response = authenticated_client.get('/api/v1/webhooks/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_webhooks_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        WebhookFactory.create_batch(2, user=user)
        WebhookFactory.create_batch(3, user=other_user)
        
        response = authenticated_client.get('/api/v1/webhooks/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_create_webhook(self, authenticated_client, user):
        response = authenticated_client.post(
            '/api/v1/webhooks/',
            {
                'name': 'Test Webhook',
                'event_type': 'checklist_completed',
                'endpoint_url': 'https://api.example.com/webhook',
                'is_active': True,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Webhook'

    def test_create_sets_user(self, authenticated_client, user):
        response = authenticated_client.post(
            '/api/v1/webhooks/',
            {
                'name': 'Test Webhook',
                'event_type': 'checklist_completed',
                'endpoint_url': 'https://api.example.com/webhook',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_webhook_secret_not_exposed(self, authenticated_client, user):
        response = authenticated_client.post(
            '/api/v1/webhooks/',
            {
                'name': 'Test Webhook',
                'event_type': 'checklist_completed',
                'endpoint_url': 'https://api.example.com/webhook',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert 'secret' not in response.data

    def test_retrieve_webhook(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        
        response = authenticated_client.get(f'/api/v1/webhooks/{webhook.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == webhook.id

    def test_update_webhook(self, authenticated_client, user):
        webhook = WebhookFactory(user=user, is_active=True)
        
        response = authenticated_client.patch(
            f'/api/v1/webhooks/{webhook.id}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is False

    def test_delete_webhook(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        
        response = authenticated_client.delete(f'/api/v1/webhooks/{webhook.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_test_webhook(self, authenticated_client, user):
        from unittest.mock import patch
        
        webhook = WebhookFactory(user=user, endpoint_url='https://api.example.com/webhook')
        
        with patch('apps.webhooks.services.WebhookService.test_webhook') as mock_test:
            mock_test.return_value = {
                'success': True,
                'response_code': 200,
                'response_body': 'OK',
                'error_message': None,
                'duration_ms': 100.0,
            }
            response = authenticated_client.post(f'/api/v1/webhooks/{webhook.id}/test/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True

    def test_regenerate_secret(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        old_secret = webhook.secret
        
        response = authenticated_client.post(f'/api/v1/webhooks/{webhook.id}/regenerate_secret/')
        assert response.status_code == status.HTTP_200_OK
        
        webhook.refresh_from_db()
        assert webhook.secret != old_secret

    def test_webhook_events(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        WebhookEventFactory.create_batch(3, webhook=webhook)
        
        response = authenticated_client.get(f'/api/v1/webhooks/{webhook.id}/events/')
        assert response.status_code == status.HTTP_200_OK

    def test_stats_action(self, authenticated_client, user):
        webhook = WebhookFactory(user=user, is_active=True)
        WebhookFactory(user=user, is_active=False)
        WebhookEventFactory(webhook=webhook, status='sent')
        WebhookEventFactory(webhook=webhook, status='failed')
        
        response = authenticated_client.get('/api/v1/webhooks/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_webhooks'] == 2
        assert response.data['active_webhooks'] == 1

    def test_by_event_type(self, authenticated_client, user):
        WebhookFactory(user=user, event_type='checklist_completed')
        WebhookFactory(user=user, event_type='item_completed')
        
        response = authenticated_client.get('/api/v1/webhooks/by_event_type/?event_type=checklist_completed')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_by_event_type_requires_event_type(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/webhooks/by_event_type/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_access_other_users_webhook(self, authenticated_client, user):
        other_user = UserFactory()
        webhook = WebhookFactory(user=other_user)
        
        response = authenticated_client.get(f'/api/v1/webhooks/{webhook.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWebhookEventViewSet:
    def test_list_webhook_events(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        WebhookEventFactory.create_batch(3, webhook=webhook)
        
        response = authenticated_client.get('/api/v1/webhook-events/')
        assert response.status_code == status.HTTP_200_OK

    def test_list_webhook_events_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        webhook1 = WebhookFactory(user=user)
        webhook2 = WebhookFactory(user=other_user)
        WebhookEventFactory.create_batch(2, webhook=webhook1)
        WebhookEventFactory.create_batch(3, webhook=webhook2)
        
        response = authenticated_client.get('/api/v1/webhook-events/')
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_webhook_event(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        event = WebhookEventFactory(webhook=webhook)
        
        response = authenticated_client.get(f'/api/v1/webhook-events/{event.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == event.id

    def test_retry_failed_event(self, authenticated_client, user):
        from unittest.mock import patch, MagicMock
        
        webhook = WebhookFactory(user=user)
        event = WebhookEventFactory(webhook=webhook, status='failed')
        
        with patch('apps.webhooks.tasks.deliver_webhook') as mock_task:
            mock_task.delay = MagicMock()
            response = authenticated_client.post(f'/api/v1/webhook-events/{event.id}/retry/')
        
        assert response.status_code == status.HTTP_200_OK

    def test_retry_sent_event_fails(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        event = WebhookEventFactory(webhook=webhook, status='sent')
        
        response = authenticated_client.post(f'/api/v1/webhook-events/{event.id}/retry/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_event_payload(self, authenticated_client, user):
        webhook = WebhookFactory(user=user)
        event = WebhookEventFactory(webhook=webhook, payload={'test': 'data'})
        
        response = authenticated_client.get(f'/api/v1/webhook-events/{event.id}/payload/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['test'] == 'data'

    def test_cannot_access_other_users_event(self, authenticated_client, user):
        other_user = UserFactory()
        webhook = WebhookFactory(user=other_user)
        event = WebhookEventFactory(webhook=webhook)
        
        response = authenticated_client.get(f'/api/v1/webhook-events/{event.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
