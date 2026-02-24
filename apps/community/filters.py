from django_filters import CharFilter, BooleanFilter, DateTimeFilter, ChoiceFilter, NumberFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, IDFilterSet
from apps.community.models import CommunityTemplate, TemplateRating


class CommunityTemplateFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    description = CharFilter(field_name='description', lookup_expr='icontains')
    category = ChoiceFilter(field_name='category', choices=CommunityTemplate.CATEGORY_CHOICES)
    status = ChoiceFilter(field_name='status', choices=CommunityTemplate.STATUS_CHOICES)
    author_id = CharFilter(field_name='author__id')
    is_featured = BooleanFilter(field_name='is_featured')
    published_at_gte = DateTimeFilter(field_name='published_at', lookup_expr='gte')
    published_at_lte = DateTimeFilter(field_name='published_at', lookup_expr='lte')
    published_at_is_null = BooleanFilter(field_name='published_at__isnull')
    rating_gte = NumberFilter(field_name='rating', lookup_expr='gte')
    rating_lte = NumberFilter(field_name='rating', lookup_expr='lte')
    download_count_gte = NumberFilter(field_name='download_count', lookup_expr='gte')
    download_count_lte = NumberFilter(field_name='download_count', lookup_expr='lte')
    has_tags = BooleanFilter(method='filter_has_tags')
    tag = CharFilter(method='filter_tag')

    class Meta:
        model = CommunityTemplate
        fields = [
            'name', 'description', 'category', 'status', 'author_id',
            'is_featured', 'published_at_gte', 'published_at_lte', 'published_at_is_null',
            'rating_gte', 'rating_lte', 'download_count_gte', 'download_count_lte',
            'has_tags', 'tag'
        ]
        search_fields = ['name', 'description']
        ordering_fields = ['name', 'created_at', 'rating', 'download_count', 'published_at']

    def filter_has_tags(self, queryset, name, value):
        if value:
            return queryset.exclude(tags=[])
        return queryset.filter(tags=[])

    def filter_tag(self, queryset, name, value):
        if value:
            return queryset.filter(tags__icontains=value)
        return queryset


class TemplateRatingFilter(TimestampedFilterSet, IDFilterSet):
    rating = NumberFilter(field_name='rating')
    rating_gte = NumberFilter(field_name='rating', lookup_expr='gte')
    rating_lte = NumberFilter(field_name='rating', lookup_expr='lte')
    user_id = CharFilter(field_name='user__id')
    community_template_id = CharFilter(field_name='community_template__id')
    has_comment = BooleanFilter(method='filter_has_comment')

    class Meta:
        model = TemplateRating
        fields = [
            'rating', 'rating_gte', 'rating_lte', 'user_id',
            'community_template_id', 'has_comment'
        ]
        ordering_fields = ['created_at', 'rating']

    def filter_has_comment(self, queryset, name, value):
        if value:
            return queryset.exclude(comment='')
        return queryset.filter(comment='')
