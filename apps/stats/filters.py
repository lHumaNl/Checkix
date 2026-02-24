from django_filters import CharFilter, BooleanFilter, DateFilter, NumberFilter

from apps.core.filters import TimestampedFilterSet, IDFilterSet
from apps.stats.models import ChecklistUsageStats


class ChecklistUsageStatsFilter(TimestampedFilterSet, IDFilterSet):
    template_id = CharFilter(field_name='template__id')
    date = DateFilter(field_name='date')
    date_gte = DateFilter(field_name='date', lookup_expr='gte')
    date_lte = DateFilter(field_name='date', lookup_expr='lte')
    instances_created_gte = NumberFilter(field_name='instances_created', lookup_expr='gte')
    instances_created_lte = NumberFilter(field_name='instances_created', lookup_expr='lte')
    instances_completed_gte = NumberFilter(field_name='instances_completed', lookup_expr='gte')
    instances_completed_lte = NumberFilter(field_name='instances_completed', lookup_expr='lte')
    avg_completion_time_gte = NumberFilter(field_name='avg_completion_time_seconds', lookup_expr='gte')
    avg_completion_time_lte = NumberFilter(field_name='avg_completion_time_seconds', lookup_expr='lte')
    avg_completion_percentage_gte = NumberFilter(field_name='avg_completion_percentage', lookup_expr='gte')
    avg_completion_percentage_lte = NumberFilter(field_name='avg_completion_percentage', lookup_expr='lte')
    has_completion_time = BooleanFilter(method='filter_has_completion_time')

    class Meta:
        model = ChecklistUsageStats
        fields = [
            'template_id', 'date', 'date_gte', 'date_lte',
            'instances_created_gte', 'instances_created_lte',
            'instances_completed_gte', 'instances_completed_lte',
            'avg_completion_time_gte', 'avg_completion_time_lte',
            'avg_completion_percentage_gte', 'avg_completion_percentage_lte',
            'has_completion_time'
        ]
        ordering_fields = ['date', 'instances_created', 'instances_completed', 'avg_completion_time_seconds']

    def filter_has_completion_time(self, queryset, name, value):
        if value:
            return queryset.exclude(avg_completion_time_seconds__isnull=True)
        return queryset.filter(avg_completion_time_seconds__isnull=True)
