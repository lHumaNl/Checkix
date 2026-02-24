from django_filters import CharFilter, BooleanFilter, ChoiceFilter

from apps.core.filters import TimestampedFilterSet, IDFilterSet
from apps.assignments.models import Assignment


class AssignmentFilter(TimestampedFilterSet, IDFilterSet):
    assignment_type = ChoiceFilter(field_name='assignment_type', choices=Assignment.TYPE_CHOICES)
    assignee_type = ChoiceFilter(field_name='assignee_type', choices=Assignment.ASSIGNMENT_TYPE_CHOICES)
    checklist_template_id = CharFilter(field_name='checklist_template__id')
    checklist_item_id = CharFilter(field_name='checklist_item__id')
    checklist_instance_id = CharFilter(field_name='checklist_instance__id')
    assignee_user_id = CharFilter(field_name='assignee_user__id')
    assignee_group_id = CharFilter(field_name='assignee_group__id')
    is_exclusive = BooleanFilter(field_name='is_exclusive')
    auto_notify = BooleanFilter(field_name='auto_notify')
    has_user = BooleanFilter(method='filter_has_user')
    has_group = BooleanFilter(method='filter_has_group')
    assignee_parameter_contains = CharFilter(field_name='assignee_parameter', lookup_expr='icontains')

    class Meta:
        model = Assignment
        fields = [
            'assignment_type', 'assignee_type', 'checklist_template_id',
            'checklist_item_id', 'checklist_instance_id', 'assignee_user_id',
            'assignee_group_id', 'is_exclusive', 'auto_notify', 'has_user',
            'has_group', 'assignee_parameter_contains'
        ]
        ordering_fields = ['created_at', 'updated_at', 'assignment_type', 'assignee_type']

    def filter_has_user(self, queryset, name, value):
        if value:
            return queryset.filter(assignee_user__isnull=False)
        return queryset.filter(assignee_user__isnull=True)

    def filter_has_group(self, queryset, name, value):
        if value:
            return queryset.filter(assignee_group__isnull=False)
        return queryset.filter(assignee_group__isnull=True)
