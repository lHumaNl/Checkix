from django_filters import CharFilter, BooleanFilter, ChoiceFilter, DateTimeFilter, NumberFilter

from apps.core.filters import TimestampedFilterSet
from apps.ldap.models import LDAPSyncLog


class LDAPSyncLogFilter(TimestampedFilterSet):
    status = ChoiceFilter(field_name='status', choices=LDAPSyncLog.STATUS_CHOICES)
    has_error = BooleanFilter(method='filter_has_error')
    users_synced_gte = NumberFilter(field_name='users_synced', lookup_expr='gte')
    groups_synced_gte = NumberFilter(field_name='groups_synced', lookup_expr='gte')
    started_at_gte = DateTimeFilter(field_name='started_at', lookup_expr='gte')
    started_at_lte = DateTimeFilter(field_name='started_at', lookup_expr='lte')
    completed_at_gte = DateTimeFilter(field_name='completed_at', lookup_expr='gte')
    completed_at_lte = DateTimeFilter(field_name='completed_at', lookup_expr='lte')
    duration_seconds_gte = NumberFilter(method='filter_duration_gte')

    class Meta:
        model = LDAPSyncLog
        fields = [
            'status', 'has_error',
            'users_synced_gte', 'groups_synced_gte',
            'started_at_gte', 'started_at_lte',
            'completed_at_gte', 'completed_at_lte',
            'duration_seconds_gte'
        ]
        ordering_fields = ['started_at', 'completed_at', 'status', 'created_at']

    def filter_has_error(self, queryset, name, value):
        if value:
            return queryset.exclude(error_message='')
        return queryset.filter(error_message='')

    def filter_duration_gte(self, queryset, name, value):
        from django.db.models import F, ExpressionWrapper, fields
        
        duration = ExpressionWrapper(
            F('completed_at') - F('started_at'),
            output_field=fields.DurationField()
        )
        
        from datetime import timedelta
        return queryset.annotate(duration=duration).filter(
            completed_at__isnull=False,
            duration__gte=timedelta(seconds=value)
        )
