from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel


class Assignment(TimestampedModel):
    TYPE_CHOICES = [
        ('template', 'Template Level'),
        ('item', 'Item Level'),
        ('runtime', 'Runtime Instance'),
    ]
    ASSIGNMENT_TYPE_CHOICES = [
        ('user', 'Specific User'),
        ('group', 'Group'),
        ('parameter', 'Parameter/Placeholder'),
        ('manager', 'Manager'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assignments',
        null=True,
        blank=True,
    )
    assignment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    checklist_template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='assignments'
    )
    checklist_item = models.ForeignKey(
        'checklists.ChecklistItem',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='assignments'
    )
    checklist_instance = models.ForeignKey(
        'checklist_instances.ChecklistInstance',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='runtime_assignments'
    )
    assignee_type = models.CharField(max_length=20, choices=ASSIGNMENT_TYPE_CHOICES)
    assignee_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_assignments'
    )
    assignee_group = models.ForeignKey(
        'users.Group',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_assignments'
    )
    assignee_parameter = models.CharField(max_length=100, blank=True)
    is_exclusive = models.BooleanField(default=False)
    auto_notify = models.BooleanField(default=True)

    class Meta:
        db_table = 'assignments'
        ordering = ['-created_at']

    def __str__(self):
        target = self._get_target_name()
        assignee = self._get_assignee_name()
        return f"{target} -> {assignee}"

    def _get_target_name(self):
        if self.assignment_type == 'template' and self.checklist_template:
            return f"Template: {self.checklist_template.name}"
        elif self.assignment_type == 'item' and self.checklist_item:
            return f"Item: {self.checklist_item.title}"
        elif self.assignment_type == 'runtime' and self.checklist_instance:
            return f"Instance: {self.checklist_instance.name}"
        return "Unknown Target"

    def _get_assignee_name(self):
        if self.assignee_type == 'user' and self.assignee_user:
            return self.assignee_user.username
        elif self.assignee_type == 'group' and self.assignee_group:
            return f"Group: {self.assignee_group.name}"
        elif self.assignee_type == 'parameter':
            return f"Parameter: {self.assignee_parameter}"
        elif self.assignee_type == 'manager':
            return "Manager"
        return "Unassigned"

    def clean(self):
        from django.core.exceptions import ValidationError
        self._validate_assignment_type()
        self._validate_assignee_type()

    def _validate_assignment_type(self):
        from django.core.exceptions import ValidationError
        type_field_map = {
            'template': 'checklist_template',
            'item': 'checklist_item',
            'runtime': 'checklist_instance',
        }
        required_field = type_field_map.get(self.assignment_type)
        if required_field and not getattr(self, required_field):
            raise ValidationError(
                {required_field: f'This field is required for assignment_type "{self.assignment_type}"'}
            )

    def _validate_assignee_type(self):
        from django.core.exceptions import ValidationError
        type_field_map = {
            'user': 'assignee_user',
            'group': 'assignee_group',
            'parameter': 'assignee_parameter',
        }
        if self.assignee_type == 'manager':
            return
        required_field = type_field_map.get(self.assignee_type)
        if required_field:
            value = getattr(self, required_field)
            if self.assignee_type == 'parameter' and not value:
                raise ValidationError(
                    {'assignee_parameter': 'This field is required for assignee_type "parameter"'}
                )
            elif self.assignee_type in ['user', 'group'] and not value:
                raise ValidationError(
                    {required_field: f'This field is required for assignee_type "{self.assignee_type}"'}
                )

    @property
    def assignee_display(self):
        return self._get_assignee_name()

    @property
    def target_display(self):
        return self._get_target_name()
