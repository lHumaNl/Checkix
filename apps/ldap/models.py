import logging
from django.db import models
from apps.core.models import TimestampedModel

logger = logging.getLogger(__name__)


class LDAPSyncLog(TimestampedModel):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('partial', 'Partial'),
        ('failed', 'Failed'),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success')
    users_synced = models.PositiveIntegerField(default=0)
    groups_synced = models.PositiveIntegerField(default=0)
    users_created = models.PositiveIntegerField(default=0)
    groups_created = models.PositiveIntegerField(default=0)
    users_updated = models.PositiveIntegerField(default=0)
    groups_updated = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-started_at']
        verbose_name = 'LDAP Sync Log'
        verbose_name_plural = 'LDAP Sync Logs'

    def __str__(self):
        return f"LDAP Sync {self.started_at} - {self.status}"

    @property
    def duration_seconds(self):
        if self.completed_at and self.started_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
