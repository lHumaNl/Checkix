from django.conf import settings
from django.db import models

from apps.core.models import TimestampedModel


class DynamicDueDateRule(TimestampedModel):
    TRIGGER_TYPE_CHOICES = [
        ('checklist_start', 'Checklist Start'),
        ('item_completion', 'Item Completion'),
        ('parameter_value', 'Parameter'),
        ('calendar_event', 'Calendar Event'),
    ]

    checklist_template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='due_date_rules'
    )
    checklist_item = models.ForeignKey(
        'checklists.ChecklistItem',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='due_date_rules'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='due_date_rules',
        null=True,
        blank=True,
    )
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_TYPE_CHOICES)
    trigger_item_id = models.PositiveIntegerField(null=True, blank=True)
    trigger_parameter_name = models.CharField(max_length=100, blank=True)
    offset_minutes = models.IntegerField(default=0)
    business_days_only = models.BooleanField(default=False)

    class Meta:
        db_table = 'dynamic_due_date_rules'
        ordering = ['created_at']

    def __str__(self):
        return f"DueDateRule({self.trigger_type}, offset={self.offset_minutes}m)"


class NotificationRule(TimestampedModel):
    EVENT_CHOICES = [
        ('task_due_in', 'Task Due In'),
        ('task_overdue_by', 'Task Overdue'),
        ('task_completed', 'Task Completed'),
        ('task_status_changed', 'Status Changed'),
        ('checklist_completed', 'Checklist Completed'),
        ('task_assigned', 'Task Assigned'),
    ]

    checklist_template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification_rules'
    )
    checklist_item = models.ForeignKey(
        'checklists.ChecklistItem',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification_rules'
    )
    assignment = models.ForeignKey(
        'assignments.Assignment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification_rules'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_rules',
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'notification_rules'
        ordering = ['created_at']

    def __str__(self):
        return f"NotificationRule({self.event_type})"


class NotificationSequence(TimestampedModel):
    RECIPIENT_TYPE_CHOICES = [
        ('assignee', 'Assignee'),
        ('group', 'Group'),
        ('custom', 'Custom Email'),
    ]

    notification_rule = models.ForeignKey(
        NotificationRule,
        on_delete=models.CASCADE,
        related_name='sequences'
    )
    sequence_order = models.PositiveIntegerField(default=0)
    trigger_offset_minutes = models.IntegerField()
    recipient_type = models.CharField(max_length=20, choices=RECIPIENT_TYPE_CHOICES)
    recipient_group = models.ForeignKey(
        'users.Group',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    custom_email = models.EmailField(blank=True)
    email_subject = models.CharField(max_length=200, blank=True)
    email_body = models.TextField(blank=True)

    class Meta:
        db_table = 'notification_sequences'
        ordering = ['sequence_order']

    def __str__(self):
        return f"Sequence({self.sequence_order}, {self.recipient_type})"


class NotificationLog(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    notification_sequence = models.ForeignKey(
        NotificationSequence,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    checklist_instance = models.ForeignKey(
        'checklist_instances.ChecklistInstance',
        on_delete=models.CASCADE,
        related_name='notification_logs'
    )
    recipient_email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'notification_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"NotificationLog({self.recipient_email}, {self.status})"
