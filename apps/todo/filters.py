from django_filters import CharFilter, BooleanFilter, DateTimeFilter, ChoiceFilter, ModelChoiceFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, SoftDeleteFilterSet, IDFilterSet
from apps.todo.models import TodoList, TodoItem


class TodoListFilter(TimestampedFilterSet, SearchFilterSet, SoftDeleteFilterSet, IDFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    status = ChoiceFilter(field_name='status', choices=TodoList.STATUS_CHOICES)
    priority = ChoiceFilter(field_name='priority', choices=TodoList.PRIORITY_CHOICES)
    is_favorite = BooleanFilter(field_name='is_favorite')
    folder_id = CharFilter(field_name='folder__id')
    folder_is_null = BooleanFilter(field_name='folder__isnull')
    tag_id = CharFilter(field_name='tags__id')
    due_date_gte = DateTimeFilter(field_name='due_date', lookup_expr='gte')
    due_date_lte = DateTimeFilter(field_name='due_date', lookup_expr='lte')
    due_date_is_null = BooleanFilter(field_name='due_date__isnull')
    completed_at_gte = DateTimeFilter(field_name='completed_at', lookup_expr='gte')
    completed_at_lte = DateTimeFilter(field_name='completed_at', lookup_expr='lte')
    has_items = BooleanFilter(method='filter_has_items')
    has_completed_items = BooleanFilter(method='filter_has_completed_items')

    class Meta:
        model = TodoList
        fields = [
            'name', 'status', 'priority', 'is_favorite', 'folder_id',
            'folder_is_null', 'tag_id', 'due_date_gte', 'due_date_lte',
            'due_date_is_null', 'completed_at_gte', 'completed_at_lte',
            'has_items', 'has_completed_items', 'is_deleted', 'include_deleted'
        ]
        search_fields = ['name', 'description']
        ordering_fields = ['name', 'created_at', 'updated_at', 'due_date', 'priority']

    def filter_has_items(self, queryset, name, value):
        if value:
            return queryset.filter(items__isnull=False).distinct()
        return queryset.filter(items__isnull=True)

    def filter_has_completed_items(self, queryset, name, value):
        if value:
            return queryset.filter(items__status='completed').distinct()
        return queryset.exclude(items__status='completed')


class TodoItemFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    title = CharFilter(field_name='title', lookup_expr='icontains')
    status = ChoiceFilter(field_name='status', choices=TodoItem.STATUS_CHOICES)
    priority = ChoiceFilter(field_name='priority', choices=TodoItem.PRIORITY_CHOICES)
    parent_id = CharFilter(field_name='parent__id')
    parent_is_null = BooleanFilter(field_name='parent__isnull')
    due_date_gte = DateTimeFilter(field_name='due_date', lookup_expr='gte')
    due_date_lte = DateTimeFilter(field_name='due_date', lookup_expr='lte')
    due_date_is_null = BooleanFilter(field_name='due_date__isnull')
    completed_at_gte = DateTimeFilter(field_name='completed_at', lookup_expr='gte')
    completed_at_lte = DateTimeFilter(field_name='completed_at', lookup_expr='lte')
    is_completed = BooleanFilter(method='filter_is_completed')
    has_children = BooleanFilter(method='filter_has_children')

    class Meta:
        model = TodoItem
        fields = [
            'title', 'status', 'priority', 'parent_id', 'parent_is_null',
            'due_date_gte', 'due_date_lte', 'due_date_is_null',
            'completed_at_gte', 'completed_at_lte', 'is_completed', 'has_children'
        ]
        search_fields = ['title', 'description']
        ordering_fields = ['title', 'order', 'created_at', 'updated_at', 'due_date', 'priority']

    def filter_is_completed(self, queryset, name, value):
        if value:
            return queryset.filter(status='completed')
        return queryset.exclude(status='completed')

    def filter_has_children(self, queryset, name, value):
        if value:
            return queryset.filter(children__isnull=False).distinct()
        return queryset.filter(children__isnull=True)
