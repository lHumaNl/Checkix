import uuid
from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel


class AuditLog(TimestampedModel):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('assigned', 'Assigned'),
        ('unassigned', 'Unassigned'),
        ('exported', 'Exported'),
        ('imported', 'Imported'),
    ]
    ENTITY_CHOICES = [
        ('checklist_template', 'Template'),
        ('checklist_instance', 'Instance'),
        ('checklist_item', 'Item'),
        ('todo_list', 'Todo List'),
        ('todo_item', 'Todo Item'),
        ('folder', 'Folder'),
        ('tag', 'Tag'),
        ('user', 'User'),
        ('group', 'Group'),
        ('assignment', 'Assignment'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=30, choices=ENTITY_CHOICES)
    entity_id = models.PositiveIntegerField()
    entity_name = models.CharField(max_length=200, blank=True)
    checklist_instance = models.ForeignKey(
        'checklist_instances.ChecklistInstance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    additional_data = models.JSONField(default=dict)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.entity_type}:{self.entity_id}"

    @classmethod
    def log_action(cls, user, action, entity_type, entity_id, entity_name='',
                   checklist_instance=None, changes=None, request=None, **kwargs):
        instance = cls(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            checklist_instance=checklist_instance,
            changes=changes or {},
            additional_data=kwargs
        )
        if request:
            instance.ip_address = cls._get_client_ip(request)
            instance.user_agent = request.META.get('HTTP_USER_AGENT', '')
        instance.save()
        return instance

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')
