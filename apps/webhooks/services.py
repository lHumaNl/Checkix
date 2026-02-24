import ipaddress
import json
import time
from typing import Optional, Dict, Any
from urllib.parse import urlparse

import requests
from django.utils import timezone
from django.db import transaction

from apps.webhooks.models import Webhook, WebhookEvent


class WebhookService:
    TIMEOUT_SECONDS = 30
    MAX_RETRIES = 3
    BASE_RETRY_DELAY = 60

    @staticmethod
    def _validate_webhook_url(url: str) -> None:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid webhook URL")
        if hostname in ('localhost', '127.0.0.1', '0.0.0.0', '::1'):
            raise ValueError("Webhook URL cannot target localhost")
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                raise ValueError("Webhook URL cannot target internal networks")
        except ValueError as e:
            if "does not appear to be" not in str(e):
                raise

    @classmethod
    def trigger_webhook(
        cls,
        webhook: Webhook,
        event_type: str,
        payload: Dict[str, Any],
        checklist_instance=None
    ) -> WebhookEvent:
        event = WebhookEvent.objects.create(
            webhook=webhook,
            checklist_instance=checklist_instance,
            event_type=event_type,
            payload=payload,
            status='pending'
        )

        from apps.webhooks.tasks import deliver_webhook
        try:
            deliver_webhook.delay(event.id)
        except Exception:
            cls._deliver_sync(event)

        return event

    @classmethod
    def trigger_event(
        cls,
        user,
        event_type: str,
        payload: Dict[str, Any],
        checklist_instance=None
    ) -> list:
        webhooks = Webhook.objects.filter(
            user=user,
            event_type=event_type,
            is_active=True
        )

        events = []
        for webhook in webhooks:
            event = cls.trigger_webhook(
                webhook=webhook,
                event_type=event_type,
                payload=payload,
                checklist_instance=checklist_instance
            )
            events.append(event)

        return events

    @classmethod
    def deliver(cls, event: WebhookEvent) -> bool:
        if event.status not in ['pending', 'retrying']:
            return False

        webhook = event.webhook
        payload_str = json.dumps(event.payload)

        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event.event_type,
            'X-Webhook-ID': str(event.id),
            'X-Webhook-Timestamp': str(int(time.time())),
        }

        if webhook.secret:
            signature = webhook.generate_signature(payload_str)
            headers['X-Webhook-Signature'] = signature

        if webhook.headers:
            for key, value in webhook.headers.items():
                if isinstance(value, str):
                    headers[key] = value

        start_time = time.time()
        try:
            cls._validate_webhook_url(webhook.endpoint_url)
            response = requests.post(
                webhook.endpoint_url,
                data=payload_str,
                headers=headers,
                timeout=cls.TIMEOUT_SECONDS
            )
            duration_ms = (time.time() - start_time) * 1000

            if 200 <= response.status_code < 300:
                event.mark_sent(
                    response_code=response.status_code,
                    response_body=response.text[:5000]
                )
                return True
            else:
                event.mark_failed(
                    response_code=response.status_code,
                    response_body=response.text[:5000]
                )
                return False

        except requests.exceptions.Timeout:
            duration_ms = (time.time() - start_time) * 1000
            event.mark_failed(response_body='Request timed out')
            return False

        except requests.exceptions.ConnectionError as e:
            event.mark_failed(response_body=f'Connection error: {str(e)[:500]}')
            return False

        except Exception as e:
            event.mark_failed(response_body=f'Error: {str(e)[:500]}')
            return False

    @classmethod
    def _deliver_sync(cls, event: WebhookEvent) -> bool:
        return cls.deliver(event)

    @classmethod
    def test_webhook(cls, webhook: Webhook) -> Dict[str, Any]:
        test_payload = {
            'event': 'test',
            'webhook_id': str(webhook.id),
            'webhook_name': webhook.name,
            'timestamp': timezone.now().isoformat(),
            'test': True
        }

        payload_str = json.dumps(test_payload)
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'test',
            'X-Webhook-Test': 'true',
        }

        if webhook.secret:
            signature = webhook.generate_signature(payload_str)
            headers['X-Webhook-Signature'] = signature

        if webhook.headers:
            for key, value in webhook.headers.items():
                if isinstance(value, str):
                    headers[key] = value

        start_time = time.time()
        try:
            cls._validate_webhook_url(webhook.endpoint_url)
            response = requests.post(
                webhook.endpoint_url,
                data=payload_str,
                headers=headers,
                timeout=cls.TIMEOUT_SECONDS
            )
            duration_ms = (time.time() - start_time) * 1000

            return {
                'success': 200 <= response.status_code < 300,
                'response_code': response.status_code,
                'response_body': response.text[:5000],
                'error_message': None,
                'duration_ms': round(duration_ms, 2),
            }

        except requests.exceptions.Timeout:
            duration_ms = (time.time() - start_time) * 1000
            return {
                'success': False,
                'response_code': None,
                'response_body': None,
                'error_message': 'Request timed out',
                'duration_ms': round(duration_ms, 2),
            }

        except requests.exceptions.ConnectionError as e:
            duration_ms = (time.time() - start_time) * 1000
            return {
                'success': False,
                'response_code': None,
                'response_body': None,
                'error_message': f'Connection error: {str(e)[:200]}',
                'duration_ms': round(duration_ms, 2),
            }

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            return {
                'success': False,
                'response_code': None,
                'response_body': None,
                'error_message': str(e)[:200],
                'duration_ms': round(duration_ms, 2),
            }

    @classmethod
    def process_pending_retries(cls) -> int:
        events = WebhookEvent.objects.filter(
            status='retrying',
            next_retry_at__lte=timezone.now()
        ).select_related('webhook')

        processed = 0
        for event in events:
            if event.can_retry:
                cls.deliver(event)
                processed += 1

        return processed

    @classmethod
    def build_checklist_payload(cls, instance, event_type: str) -> Dict[str, Any]:
        return {
            'event': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': {
                'checklist_instance': {
                    'id': str(instance.id),
                    'name': instance.name,
                    'status': instance.status,
                    'progress_percentage': instance.progress_percentage,
                    'started_at': instance.started_at.isoformat() if instance.started_at else None,
                    'completed_at': instance.completed_at.isoformat() if instance.completed_at else None,
                    'user_id': str(instance.user_id),
                },
                'template': {
                    'id': str(instance.template.id) if instance.template else None,
                    'name': instance.template.name if instance.template else None,
                } if instance.template else None,
                'version': {
                    'id': str(instance.version.id) if instance.version else None,
                    'version_number': instance.version.version_number if instance.version else None,
                } if instance.version else None,
            }
        }

    @classmethod
    def build_item_payload(cls, item_instance, event_type: str) -> Dict[str, Any]:
        return {
            'event': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': {
                'item_instance': {
                    'id': str(item_instance.id),
                    'title': item_instance.title,
                    'order': item_instance.order,
                    'is_completed': item_instance.is_completed,
                    'completed_at': item_instance.completed_at.isoformat() if item_instance.completed_at else None,
                },
                'checklist_instance': {
                    'id': str(item_instance.instance.id),
                    'name': item_instance.instance.name,
                    'status': item_instance.instance.status,
                    'progress_percentage': item_instance.instance.progress_percentage,
                },
            }
        }
