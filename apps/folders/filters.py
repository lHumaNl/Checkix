from django_filters import CharFilter, BooleanFilter, NumberFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet
from apps.folders.models import Folder


class FolderFilter(TimestampedFilterSet, SearchFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    name_exact = CharFilter(field_name='name', lookup_expr='iexact')
    parent_id = CharFilter(field_name='parent__id')
    parent_is_null = BooleanFilter(field_name='parent__isnull')
    has_icon = BooleanFilter(method='filter_has_icon')
    depth = NumberFilter(method='filter_depth')
    depth_lte = NumberFilter(method='filter_depth_lte')

    class Meta:
        model = Folder
        fields = ['name', 'name_exact', 'parent_id', 'parent_is_null', 'has_icon', 'depth', 'depth_lte']
        search_fields = ['name', 'icon']
        ordering_fields = ['name', 'order', 'created_at', 'updated_at']

    def filter_has_icon(self, queryset, name, value):
        if value:
            return queryset.exclude(icon='')
        return queryset.filter(icon='')

    def filter_depth(self, queryset, name, value):
        folders = []
        for folder in queryset:
            if folder.depth == value:
                folders.append(folder.id)
        return queryset.filter(id__in=folders)

    def filter_depth_lte(self, queryset, name, value):
        folders = []
        for folder in queryset:
            if folder.depth <= value:
                folders.append(folder.id)
        return queryset.filter(id__in=folders)


class FolderTreeFilter(SearchFilterSet):
    parent_is_null = BooleanFilter(field_name='parent__isnull')

    class Meta:
        model = Folder
        fields = ['parent_is_null']
        search_fields = ['name']
