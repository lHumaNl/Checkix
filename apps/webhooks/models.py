import hashlib
import hmac
import secrets
from datetime import timedelta

from django.db import models
from django.conf import settings
from django.utils import timezone

from apps.core.models import TimestampedModel


class Webhook(TimestampedModel):
    EVENT_CHOICES = [
        ('checklist_created', 'Checklist Created'),
        ('checklist_started', 'Checklist Started'),
        ('checklist_completed', 'Checklist Completed'),
        ('item_completed', 'Item Completed'),
        ('item_failed', 'Item Failed'),
        ('user_assigned', 'User Assigned'),
        ('due_date_passed', 'Due Date Passed'),
    ]

    name = models.CharField(max_length=200)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='webhooks'
    )
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    endpoint_url = models.URLField(max_length=500)
    secret = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    headers = models.JSONField(default=dict)

    class Meta:
        db_table = 'webhooks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'event_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_event_type_display()})"

    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def generate_signature(self, payload: str) -> str:
        if not self.secret:
            return ''
        signature = hmac.new(
            self.secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f'sha256={signature}'


class WebhookEvent(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]

    webhook = models.ForeignKey(
        Webhook,
        on_delete=models.CASCADE,
        related_name='events'
    )
    checklist_instance = models.ForeignKey(
        'checklist_instances.ChecklistInstance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhook_events'
    )
    event_type = models.CharField(max_length=30)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    response_code = models.PositiveIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'webhook_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['webhook', 'status']),
            models.Index(fields=['status', 'next_retry_at']),
            models.Index(fields=['checklist_instance']),
        ]

    def __str__(self):
        return f"{self.webhook.name} - {self.event_type} ({self.status})"

    def mark_sent(self, response_code: int, response_body: str = ''):
        self.status = 'sent'
        self.response_code = response_code
        self.response_body = response_body[:5000]
        self.sent_at = timezone.now()
        self.save()

    def mark_failed(self, response_code: int = None, response_body: str = '', retry: bool = True):
        self.response_code = response_code
        self.response_body = response_body[:5000]
        
        if retry and self.retry_count < self.max_retries:
            self.status = 'retrying'
            self.retry_count += 1
            delay_seconds = min(2 ** self.retry_count * 60, 3600)
            self.next_retry_at = timezone.now() + timedelta(seconds=delay_seconds)
        else:
            self.status = 'failed'
            self.next_retry_at = None
        
        self.save()

    @property
    def can_retry(self) -> bool:
        return (
            self.status == 'retrying' and
            self.next_retry_at and
            self.next_retry_at <= timezone.now()
        )
