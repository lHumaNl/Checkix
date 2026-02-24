import uuid
from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel


class RunLink(TimestampedModel):
    ACCESS_TYPE_CHOICES = [
        ('public', 'Public'),
        ('team', 'Team'),
        ('private', 'Private'),
    ]

    checklist_template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.CASCADE,
        related_name='run_links'
    )
    unique_id = models.UUIDField(unique=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPE_CHOICES, default='public')
    preset_values = models.JSONField(default=dict)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_run_links'
    )

    class Meta:
        db_table = 'run_links'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['unique_id']),
            models.Index(fields=['checklist_template']),
            models.Index(fields=['access_type']),
        ]

    def __str__(self):
        return f"{self.name} - {self.unique_id}"

    @property
    def is_expired(self):
        from django.utils import timezone
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    @property
    def is_max_uses_reached(self):
        if self.max_uses is not None:
            return self.usage_count >= self.max_uses
        return False

    @property
    def is_valid(self):
        return not self.is_expired and not self.is_max_uses_reached

    def increment_usage(self):
        from django.db.models import F
        RunLink.objects.filter(id=self.id).update(usage_count=F('usage_count') + 1)
        self.refresh_from_db()
