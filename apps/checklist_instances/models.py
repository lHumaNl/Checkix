from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel


class ChecklistInstance(TimestampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('paused', 'Paused'),
    ]

    template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instances'
    )
    version = models.ForeignKey(
        'checklists.ChecklistVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instances'
    )
    name = models.CharField(max_length=200)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checklist_instances'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    progress_percentage = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    calendar_event = models.ForeignKey(
        'calendar.CalendarEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instances'
    )

    class Meta:
        db_table = 'checklist_instances'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def calculate_progress(self):
        total_items = self.item_instances.count()
        if total_items == 0:
            return 0
        completed_items = self.item_instances.filter(is_completed=True).count()
        return int((completed_items / total_items) * 100)

    def update_progress(self):
        self.progress_percentage = self.calculate_progress()
        self.save(update_fields=['progress_percentage'])


class ChecklistItemInstance(TimestampedModel):
    instance = models.ForeignKey(
        ChecklistInstance,
        on_delete=models.CASCADE,
        related_name='item_instances'
    )
    item = models.ForeignKey(
        'checklists.ChecklistItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instances'
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    placeholder_value = models.CharField(max_length=200, blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    is_visible = models.BooleanField(default=True)

    class Meta:
        db_table = 'checklist_item_instances'
        ordering = ['order']

    def __str__(self):
        return self.title


class CompletionLog(TimestampedModel):
    ACTION_CHOICES = [
        ('complete', 'Complete'),
        ('uncomplete', 'Uncomplete'),
        ('start', 'Start'),
        ('pause', 'Pause'),
        ('resume', 'Resume'),
        ('cancel', 'Cancel'),
    ]

    instance = models.ForeignKey(
        ChecklistInstance,
        on_delete=models.CASCADE,
        related_name='completion_logs'
    )
    item_instance = models.ForeignKey(
        ChecklistItemInstance,
        on_delete=models.CASCADE,
        related_name='completion_logs',
        null=True,
        blank=True
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'completion_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.instance.name} - {self.action}"
