from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel


class CalendarEvent(TimestampedModel):
    TYPE_CHOICES = [
        ('checklist', 'Checklist'),
        ('todo', 'Todo'),
        ('custom', 'Custom'),
    ]
    RECURRENCE_CHOICES = [
        ('once', 'Once'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom'),
    ]

    title = models.CharField(max_length=200)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_events'
    )
    event_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    checklist_template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='calendar_events'
    )
    todo_list = models.ForeignKey(
        'todo.TodoList',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='calendar_events'
    )
    start_datetime = models.DateTimeField(db_index=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='once')
    recurrence_rule = models.JSONField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db')
    reminder_minutes_before = models.PositiveIntegerField(null=True, blank=True)
    template_presets = models.JSONField(null=True, blank=True)
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'calendar_events'
        ordering = ['start_datetime']

    def __str__(self):
        return self.title

    def mark_completed(self):
        from django.utils import timezone
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=['is_completed', 'completed_at', 'updated_at'])

    def reschedule(self, new_start_datetime, new_end_datetime=None):
        self.start_datetime = new_start_datetime
        if new_end_datetime:
            self.end_datetime = new_end_datetime
        self.save(update_fields=['start_datetime', 'end_datetime', 'updated_at'])

    def get_recurrence_end_date(self):
        if self.recurrence_rule and isinstance(self.recurrence_rule, dict):
            return self.recurrence_rule.get('end_date')
        return None

    def get_recurrence_count(self):
        if self.recurrence_rule and isinstance(self.recurrence_rule, dict):
            return self.recurrence_rule.get('count')
        return None

    def get_recurrence_interval(self):
        if self.recurrence_rule and isinstance(self.recurrence_rule, dict):
            return self.recurrence_rule.get('interval', 1)
        return 1

    def get_recurrence_days_of_week(self):
        if self.recurrence_rule and isinstance(self.recurrence_rule, dict):
            return self.recurrence_rule.get('days_of_week', [])
        return []
