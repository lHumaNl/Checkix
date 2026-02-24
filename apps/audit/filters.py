from django_filters import CharFilter, BooleanFilter, DateTimeFilter, ChoiceFilter, NumberFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, IDFilterSet
from apps.audit.models import AuditLog


class AuditLogFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    action = ChoiceFilter(field_name='action', choices=AuditLog.ACTION_CHOICES)
    entity_type = ChoiceFilter(field_name='entity_type', choices=AuditLog.ENTITY_CHOICES)
    entity_id = NumberFilter(field_name='entity_id')
    user_id = CharFilter(field_name='user__id')
    entity_name = CharFilter(field_name='entity_name', lookup_expr='icontains')
    ip_address = CharFilter(field_name='ip_address', lookup_expr='icontains')
    created_at_gte = DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_lte = DateTimeFilter(field_name='created_at', lookup_expr='lte')
    has_changes = BooleanFilter(method='filter_has_changes')
    has_additional_data = BooleanFilter(method='filter_has_additional_data')

    class Meta:
        model = AuditLog
        fields = [
            'action', 'entity_type', 'entity_id', 'user_id', 'entity_name',
            'ip_address', 'created_at_gte', 'created_at_lte',
            'has_changes', 'has_additional_data'
        ]
        search_fields = ['entity_name', 'user__email']
        ordering_fields = ['created_at', 'action', 'entity_type']

    def filter_has_changes(self, queryset, name, value):
        if value:
            return queryset.exclude(changes={})
        return queryset.filter(changes={})

    def filter_has_additional_data(self, queryset, name, value):
        if value:
            return queryset.exclude(additional_data={})
        return queryset.filter(additional_data={})
