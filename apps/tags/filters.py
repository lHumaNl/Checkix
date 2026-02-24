from django_filters import CharFilter, BooleanFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet
from apps.tags.models import Tag


class TagFilter(TimestampedFilterSet, SearchFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    name_exact = CharFilter(field_name='name', lookup_expr='iexact')
    color = CharFilter(field_name='color', lookup_expr='iexact')
    has_description = BooleanFilter(method='filter_has_description')

    class Meta:
        model = Tag
        fields = ['name', 'name_exact', 'color', 'has_description']
        search_fields = ['name', 'description']
        ordering_fields = ['name', 'created_at', 'updated_at']

    def filter_has_description(self, queryset, name, value):
        if value:
            return queryset.exclude(description='')
        return queryset.filter(description='')
