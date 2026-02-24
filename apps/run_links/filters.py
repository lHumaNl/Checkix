from django_filters import CharFilter, BooleanFilter, DateTimeFilter, ChoiceFilter, UUIDFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, IDFilterSet
from apps.run_links.models import RunLink


class RunLinkFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    access_type = ChoiceFilter(field_name='access_type', choices=RunLink.ACCESS_TYPE_CHOICES)
    checklist_template_id = CharFilter(field_name='checklist_template__id')
    created_by_id = CharFilter(field_name='created_by__id')
    unique_id = UUIDFilter(field_name='unique_id')
    expires_at_gte = DateTimeFilter(field_name='expires_at', lookup_expr='gte')
    expires_at_lte = DateTimeFilter(field_name='expires_at', lookup_expr='lte')
    expires_at_is_null = BooleanFilter(field_name='expires_at__isnull')
    is_expired = BooleanFilter(method='filter_is_expired')
    is_valid = BooleanFilter(method='filter_is_valid')
    has_max_uses = BooleanFilter(method='filter_has_max_uses')
    usage_count_gte = DateTimeFilter(field_name='usage_count', lookup_expr='gte')
    usage_count_lte = DateTimeFilter(field_name='usage_count', lookup_expr='lte')

    class Meta:
        model = RunLink
        fields = [
            'name', 'access_type', 'checklist_template_id', 'created_by_id',
            'unique_id', 'expires_at_gte', 'expires_at_lte', 'expires_at_is_null',
            'is_expired', 'is_valid', 'has_max_uses', 'usage_count_gte', 'usage_count_lte'
        ]
        search_fields = ['name', 'checklist_template__name']
        ordering_fields = ['name', 'created_at', 'usage_count', 'expires_at']

    def filter_is_expired(self, queryset, name, value):
        from django.utils import timezone
        if value:
            return queryset.filter(expires_at__lt=timezone.now())
        return queryset.filter(expires_at__gte=timezone.now()) | queryset.filter(expires_at__isnull=True)

    def filter_is_valid(self, queryset, name, value):
        from django.utils import timezone
        if value:
            return queryset.filter(
                expires_at__gte=timezone.now()
            ).exclude(
                expires_at__isnull=False, expires_at__lt=timezone.now()
            )
        return queryset

    def filter_has_max_uses(self, queryset, name, value):
        if value:
            return queryset.exclude(max_uses__isnull=True)
        return queryset.filter(max_uses__isnull=True)
