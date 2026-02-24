from django_filters import CharFilter, BooleanFilter, NumberFilter, DateTimeFilter

from apps.core.filters import (
    TimestampedFilterSet,
    SearchFilterSet,
    SoftDeleteFilterSet
)
from apps.checklists.models import (
    ChecklistTemplate,
    ChecklistVersion,
    ChecklistItem
)


class ChecklistTemplateFilter(TimestampedFilterSet, SearchFilterSet, SoftDeleteFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    folder_id = CharFilter(field_name='folder__id')
    folder_is_null = BooleanFilter(field_name='folder__isnull')
    is_favorite = BooleanFilter(field_name='is_favorite')
    sequential_mode = BooleanFilter(field_name='sequential_mode')
    has_icon = BooleanFilter(method='filter_has_icon')
    tag_id = CharFilter(field_name='tags__id')
    tag_name = CharFilter(field_name='tags__name', lookup_expr='icontains')
    created_by = CharFilter(field_name='user__id')
    status = CharFilter(field_name='status')

    class Meta:
        model = ChecklistTemplate
        fields = [
            'name', 'folder_id', 'folder_is_null', 'is_favorite',
            'sequential_mode', 'has_icon', 'tag_id', 'tag_name', 'created_by', 'status'
        ]
        search_fields = ['name', 'description', 'icon']
        ordering_fields = ['name', 'created_at', 'updated_at', 'is_favorite']

    def filter_has_icon(self, queryset, name, value):
        if value:
            return queryset.exclude(icon='')
        return queryset.filter(icon='')


class ChecklistVersionFilter(TimestampedFilterSet):
    is_active = BooleanFilter(field_name='is_active')
    version_number = NumberFilter(field_name='version_number')
    version_number_gte = NumberFilter(field_name='version_number', lookup_expr='gte')
    version_number_lte = NumberFilter(field_name='version_number', lookup_expr='lte')

    class Meta:
        model = ChecklistVersion
        fields = ['is_active', 'version_number', 'version_number_gte', 'version_number_lte']
        ordering_fields = ['version_number', 'created_at', 'updated_at']


class ChecklistItemFilter(TimestampedFilterSet, SearchFilterSet):
    parent_id = CharFilter(field_name='parent__id')
    parent_is_null = BooleanFilter(field_name='parent__isnull')
    is_required = BooleanFilter(field_name='is_required')
    is_halt = BooleanFilter(field_name='is_halt')
    priority = CharFilter(field_name='priority')
    priority_in = CharFilter(method='filter_priority_in')
    has_placeholder = BooleanFilter(method='filter_has_placeholder')
    has_children = BooleanFilter(method='filter_has_children')

    class Meta:
        model = ChecklistItem
        fields = [
            'parent_id', 'parent_is_null', 'is_required', 'is_halt',
            'priority', 'priority_in', 'has_placeholder', 'has_children'
        ]
        search_fields = ['title', 'description']
        ordering_fields = ['order', 'priority', 'created_at', 'updated_at']

    def filter_priority_in(self, queryset, name, value):
        if not value:
            return queryset
        priorities = [p.strip() for p in value.split(',') if p.strip()]
        return queryset.filter(priority__in=priorities)

    def filter_has_placeholder(self, queryset, name, value):
        if value:
            return queryset.filter(placeholder__isnull=False)
        return queryset.filter(placeholder__isnull=True)

    def filter_has_children(self, queryset, name, value):
        if value:
            return queryset.filter(children__isnull=False).distinct()
        return queryset.filter(children__isnull=True)
