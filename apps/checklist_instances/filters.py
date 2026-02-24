from django_filters import CharFilter, BooleanFilter, DateTimeFilter, NumberFilter, ChoiceFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, IDFilterSet
from apps.checklist_instances.models import ChecklistInstance, ChecklistItemInstance, CompletionLog


class ChecklistInstanceFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    status = ChoiceFilter(field_name='status', choices=ChecklistInstance.STATUS_CHOICES)
    status_in = CharFilter(method='filter_status_in')
    template_id = CharFilter(field_name='template__id')
    version_id = CharFilter(field_name='version__id')
    user_id = CharFilter(field_name='user__id')
    started_at_gte = DateTimeFilter(field_name='started_at', lookup_expr='gte')
    started_at_lte = DateTimeFilter(field_name='started_at', lookup_expr='lte')
    completed_at_gte = DateTimeFilter(field_name='completed_at', lookup_expr='gte')
    completed_at_lte = DateTimeFilter(field_name='completed_at', lookup_expr='lte')
    progress_gte = NumberFilter(field_name='progress_percentage', lookup_expr='gte')
    progress_lte = NumberFilter(field_name='progress_percentage', lookup_expr='lte')
    is_completed = BooleanFilter(method='filter_is_completed')
    has_calendar_event = BooleanFilter(method='filter_has_calendar_event')

    class Meta:
        model = ChecklistInstance
        fields = [
            'name', 'status', 'status_in', 'template_id', 'version_id', 'user_id',
            'started_at_gte', 'started_at_lte', 'completed_at_gte', 'completed_at_lte',
            'progress_gte', 'progress_lte', 'is_completed', 'has_calendar_event'
        ]
        search_fields = ['name', 'notes']
        ordering_fields = ['name', 'status', 'progress_percentage', 'created_at', 'updated_at', 'started_at', 'completed_at']

    def filter_status_in(self, queryset, name, value):
        if not value:
            return queryset
        statuses = [v.strip() for v in value.split(',') if v.strip()]
        return queryset.filter(status__in=statuses)

    def filter_is_completed(self, queryset, name, value):
        if value:
            return queryset.filter(progress_percentage=100)
        return queryset.filter(progress_percentage__lt=100)

    def filter_has_calendar_event(self, queryset, name, value):
        if value:
            return queryset.exclude(calendar_event__isnull=True)
        return queryset.filter(calendar_event__isnull=True)


class ChecklistItemInstanceFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    instance_id = CharFilter(field_name='instance__id')
    item_id = CharFilter(field_name='item__id')
    title = CharFilter(field_name='title', lookup_expr='icontains')
    is_completed = BooleanFilter(field_name='is_completed')
    is_visible = BooleanFilter(field_name='is_visible')
    parent_id = CharFilter(field_name='parent__id')
    parent_is_null = BooleanFilter(field_name='parent__isnull')
    has_parent = BooleanFilter(method='filter_has_parent')
    order_gte = NumberFilter(field_name='order', lookup_expr='gte')
    order_lte = NumberFilter(field_name='order', lookup_expr='lte')

    class Meta:
        model = ChecklistItemInstance
        fields = [
            'instance_id', 'item_id', 'title', 'is_completed', 'is_visible',
            'parent_id', 'parent_is_null', 'has_parent', 'order_gte', 'order_lte'
        ]
        search_fields = ['title', 'description']
        ordering_fields = ['order', 'created_at', 'updated_at']

    def filter_has_parent(self, queryset, name, value):
        if value:
            return queryset.exclude(parent__isnull=True)
        return queryset.filter(parent__isnull=True)


class CompletionLogFilter(TimestampedFilterSet, IDFilterSet):
    instance_id = CharFilter(field_name='instance__id')
    item_instance_id = CharFilter(field_name='item_instance__id')
    action = CharFilter(field_name='action', lookup_expr='icontains')
    action_in = CharFilter(method='filter_action_in')
    user_id = CharFilter(field_name='user__id')
    timestamp_gte = DateTimeFilter(field_name='timestamp', lookup_expr='gte')
    timestamp_lte = DateTimeFilter(field_name='timestamp', lookup_expr='lte')
    has_duration = BooleanFilter(method='filter_has_duration')
    duration_gte = NumberFilter(field_name='duration_seconds', lookup_expr='gte')
    duration_lte = NumberFilter(field_name='duration_seconds', lookup_expr='lte')

    class Meta:
        model = CompletionLog
        fields = [
            'instance_id', 'item_instance_id', 'action', 'action_in', 'user_id',
            'timestamp_gte', 'timestamp_lte', 'has_duration', 'duration_gte', 'duration_lte'
        ]
        ordering_fields = ['timestamp', 'created_at']

    def filter_action_in(self, queryset, name, value):
        if not value:
            return queryset
        actions = [v.strip() for v in value.split(',') if v.strip()]
        return queryset.filter(action__in=actions)

    def filter_has_duration(self, queryset, name, value):
        if value:
            return queryset.exclude(duration_seconds__isnull=True)
        return queryset.filter(duration_seconds__isnull=True)
