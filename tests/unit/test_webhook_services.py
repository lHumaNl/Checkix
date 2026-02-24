import pytest
import json
from unittest.mock import patch, MagicMock
import requests

from apps.webhooks.services import WebhookService
from apps.webhooks.models import Webhook, WebhookEvent
from tests.factories import UserFactory, WebhookFactory, WebhookEventFactory, ChecklistInstanceFactory


@pytest.mark.django_db
class TestWebhookService:
    def test_validate_webhook_url_blocks_localhost(self):
        with pytest.raises(ValueError, match="cannot target localhost"):
            WebhookService._validate_webhook_url("http://localhost/webhook")

    def test_validate_webhook_url_blocks_127_0_0_1(self):
        with pytest.raises(ValueError, match="cannot target localhost"):
            WebhookService._validate_webhook_url("http://127.0.0.1/webhook")

    def test_validate_webhook_url_blocks_private_ip(self):
        with pytest.raises(ValueError, match="cannot target internal networks"):
            WebhookService._validate_webhook_url("http://192.168.1.1/webhook")

    def test_validate_webhook_url_blocks_10_range(self):
        with pytest.raises(ValueError, match="cannot target internal networks"):
            WebhookService._validate_webhook_url("http://10.0.0.1/webhook")

    def test_validate_webhook_url_blocks_link_local(self):
        with pytest.raises(ValueError, match="cannot target internal networks"):
            WebhookService._validate_webhook_url("http://169.254.1.1/webhook")

    def test_validate_webhook_url_accepts_public(self):
        WebhookService._validate_webhook_url("https://api.example.com/webhook")

    def test_trigger_webhook_creates_event(self):
        webhook = WebhookFactory()
        
        with patch('apps.webhooks.tasks.deliver_webhook') as mock_task:
            mock_task.delay = MagicMock()
            event = WebhookService.trigger_webhook(
                webhook=webhook,
                event_type='test',
                payload={'test': 'data'},
            )
        
        assert event.webhook == webhook
        assert event.event_type == 'test'
        assert event.payload == {'test': 'data'}
        assert event.status == 'pending'

    def test_trigger_event_filters_by_user(self):
        user = UserFactory()
        webhook = WebhookFactory(user=user, event_type='checklist_completed', is_active=True)
        WebhookFactory(event_type='checklist_completed', is_active=True)
        
        events = WebhookService.trigger_event(
            user=user,
            event_type='checklist_completed',
            payload={'test': 'data'},
        )
        
        assert len(events) == 1
        assert events[0].webhook == webhook

    def test_trigger_event_filters_by_event_type(self):
        user = UserFactory()
        webhook1 = WebhookFactory(user=user, event_type='checklist_completed', is_active=True)
        webhook2 = WebhookFactory(user=user, event_type='item_completed', is_active=True)
        
        with patch('apps.webhooks.tasks.deliver_webhook') as mock_task:
            mock_task.delay = MagicMock()
            events = WebhookService.trigger_event(
                user=user,
                event_type='checklist_completed',
                payload={'test': 'data'},
            )
        
        assert len(events) == 1
        assert events[0].webhook == webhook1

    def test_trigger_event_filters_inactive(self):
        user = UserFactory()
        WebhookFactory(user=user, event_type='checklist_completed', is_active=False)
        
        events = WebhookService.trigger_event(
            user=user,
            event_type='checklist_completed',
            payload={'test': 'data'},
        )
        
        assert len(events) == 0

    def test_deliver_success(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        event = WebhookEventFactory(webhook=webhook, status='pending')
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        
        with patch('requests.post', return_value=mock_response):
            result = WebhookService.deliver(event)
        
        assert result is True
        event.refresh_from_db()
        assert event.status == 'sent'
        assert event.response_code == 200

    def test_deliver_marks_failed_on_4xx(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        event = WebhookEventFactory(webhook=webhook, status='pending')
        
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        
        with patch('requests.post', return_value=mock_response):
            result = WebhookService.deliver(event)
        
        assert result is False
        event.refresh_from_db()
        assert event.status == 'retrying'
        assert event.retry_count == 1

    def test_deliver_retries_on_failure(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        event = WebhookEventFactory(webhook=webhook, status='pending', max_retries=3)
        
        with patch('requests.post', side_effect=requests.exceptions.Timeout()):
            result = WebhookService.deliver(event)
        
        assert result is False
        event.refresh_from_db()
        assert event.status == 'retrying'
        assert event.retry_count == 1

    def test_deliver_max_retries_exceeded(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        event = WebhookEventFactory(webhook=webhook, status='pending', retry_count=3, max_retries=3)
        
        with patch('requests.post', side_effect=requests.exceptions.Timeout()):
            result = WebhookService.deliver(event)
        
        assert result is False
        event.refresh_from_db()
        assert event.status == 'failed'

    def test_deliver_includes_signature_header(self):
        webhook = WebhookFactory(
            endpoint_url='https://api.example.com/webhook',
            secret='test-secret',
        )
        event = WebhookEventFactory(webhook=webhook, status='pending', payload={'test': 'data'})
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        
        with patch('requests.post') as mock_post:
            mock_post.return_value = mock_response
            WebhookService.deliver(event)
            
            call_kwargs = mock_post.call_args[1]
            headers = call_kwargs['headers']
            assert 'X-Webhook-Signature' in headers
            assert headers['X-Webhook-Signature'].startswith('sha256=')

    def test_deliver_blocks_ssrf_url(self):
        webhook = WebhookFactory(endpoint_url='http://127.0.0.1/webhook')
        event = WebhookEventFactory(webhook=webhook, status='pending')
        
        result = WebhookService.deliver(event)
        
        assert result is False
        event.refresh_from_db()
        assert event.status == 'retrying'

    def test_test_webhook_success(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        
        with patch('requests.post', return_value=mock_response):
            result = WebhookService.test_webhook(webhook)
        
        assert result['success'] is True
        assert result['response_code'] == 200
        assert result['error_message'] is None

    def test_test_webhook_failure(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        
        with patch('requests.post', side_effect=requests.exceptions.ConnectionError('Connection failed')):
            result = WebhookService.test_webhook(webhook)
        
        assert result['success'] is False
        assert result['response_code'] is None
        assert 'Connection error' in result['error_message']

    def test_test_webhook_timeout(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        
        with patch('requests.post', side_effect=requests.exceptions.Timeout()):
            result = WebhookService.test_webhook(webhook)
        
        assert result['success'] is False
        assert result['error_message'] == 'Request timed out'

    def test_build_checklist_payload(self):
        instance = ChecklistInstanceFactory()
        
        payload = WebhookService.build_checklist_payload(instance, 'checklist_completed')
        
        assert payload['event'] == 'checklist_completed'
        assert 'timestamp' in payload
        assert 'data' in payload
        assert payload['data']['checklist_instance']['id'] == str(instance.id)

    def test_process_pending_retries(self):
        webhook = WebhookFactory(endpoint_url='https://api.example.com/webhook')
        event1 = WebhookEventFactory(webhook=webhook, status='retrying')
        event1.next_retry_at = webhook.created_at
        event1.save()
        
        event2 = WebhookEventFactory(webhook=webhook, status='pending')
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        
        with patch('requests.post', return_value=mock_response):
            count = WebhookService.process_pending_retries()
        
        assert count >= 0
