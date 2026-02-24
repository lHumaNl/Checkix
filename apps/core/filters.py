from django.db import models
from django_filters import FilterSet, CharFilter, BooleanFilter, DateTimeFilter, NumberFilter


class BaseFilterSet(FilterSet):
    """
    Base filter set with common filters for all models.
    """

    created_at_gte = DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_lte = DateTimeFilter(field_name='created_at', lookup_expr='lte')
    updated_at_gte = DateTimeFilter(field_name='updated_at', lookup_expr='gte')
    updated_at_lte = DateTimeFilter(field_name='updated_at', lookup_expr='lte')

    class Meta:
        abstract = True


class SoftDeleteFilterSet(FilterSet):
    """
    Filter set for soft delete models.
    """

    is_deleted = BooleanFilter(field_name='is_deleted')
    include_deleted = BooleanFilter(method='filter_include_deleted')

    def filter_include_deleted(self, queryset, name, value):
        if value:
            return queryset
        return queryset.filter(is_deleted=False)

    class Meta:
        abstract = True


class SearchFilterSet(FilterSet):
    """
    Filter set with search functionality.
    """

    search = CharFilter(method='filter_search')

    def filter_search(self, queryset, name, value):
        search_fields = getattr(self.Meta, 'search_fields', [])
        if not search_fields or not value:
            return queryset

        query = {}
        for field in search_fields:
            query[f'{field}__icontains'] = value

        return queryset.filter(**query) if len(query) == 1 else queryset.filter(
            *[models.Q(**{f'{field}__icontains': value}) for field in search_fields],
            _connector=models.Q.OR
        )

    class Meta:
        abstract = True


class TimestampedFilterSet(BaseFilterSet):
    """
    Filter set for timestamped models.
    """

    ordering = CharFilter(method='filter_ordering')

    def filter_ordering(self, queryset, name, value):
        if not value:
            return queryset
        ordering_fields = value.split(',')
        valid_fields = []
        allowed_fields = getattr(self.Meta, 'ordering_fields', [
            'created_at', 'updated_at', 'id'
        ])
        for field in ordering_fields:
            field_name = field.lstrip('-')
            if field_name in allowed_fields:
                valid_fields.append(field)
        return queryset.order_by(*valid_fields) if valid_fields else queryset

    class Meta:
        abstract = True


class IDFilterSet(FilterSet):
    """
    Filter set with ID-based filtering.
    """

    id = CharFilter(field_name='id')
    id_in = CharFilter(method='filter_id_in')
    id_not_in = CharFilter(method='filter_id_not_in')

    def filter_id_in(self, queryset, name, value):
        if not value:
            return queryset
        ids = [v.strip() for v in value.split(',') if v.strip()]
        return queryset.filter(id__in=ids)

    def filter_id_not_in(self, queryset, name, value):
        if not value:
            return queryset
        ids = [v.strip() for v in value.split(',') if v.strip()]
        return queryset.exclude(id__in=ids)

    class Meta:
        abstract = True
