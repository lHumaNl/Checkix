from django_filters import CharFilter, BooleanFilter, DateTimeFilter, ChoiceFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, IDFilterSet
from apps.calendar.models import CalendarEvent


class CalendarEventFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    event_type = ChoiceFilter(field_name='event_type', choices=CalendarEvent.TYPE_CHOICES)
    recurrence = ChoiceFilter(field_name='recurrence', choices=CalendarEvent.RECURRENCE_CHOICES)
    is_completed = BooleanFilter(field_name='is_completed')
    all_day = BooleanFilter(field_name='all_day')
    
    start_datetime_gte = DateTimeFilter(field_name='start_datetime', lookup_expr='gte')
    start_datetime_lte = DateTimeFilter(field_name='start_datetime', lookup_expr='lte')
    end_datetime_gte = DateTimeFilter(field_name='end_datetime', lookup_expr='gte')
    end_datetime_lte = DateTimeFilter(field_name='end_datetime', lookup_expr='lte')
    
    start_date = DateTimeFilter(field_name='start_datetime', lookup_expr='date__gte')
    end_date = DateTimeFilter(field_name='start_datetime', lookup_expr='date__lte')
    
    range_start = DateTimeFilter(method='filter_range_start')
    range_end = DateTimeFilter(method='filter_range_end')
    
    checklist_template = CharFilter(field_name='checklist_template__id')
    todo_list = CharFilter(field_name='todo_list__id')
    
    has_reminder = BooleanFilter(method='filter_has_reminder')
    has_location = BooleanFilter(method='filter_has_location')

    class Meta:
        model = CalendarEvent
        fields = [
            'event_type', 'recurrence', 'is_completed', 'all_day',
            'start_datetime_gte', 'start_datetime_lte', 'end_datetime_gte', 'end_datetime_lte',
            'start_date', 'end_date', 'range_start', 'range_end',
            'checklist_template', 'todo_list', 'has_reminder', 'has_location'
        ]
        search_fields = ['title', 'description', 'location']
        ordering_fields = ['start_datetime', 'end_datetime', 'created_at', 'updated_at', 'title']

    def filter_range_start(self, queryset, name, value):
        return queryset.filter(start_datetime__gte=value)

    def filter_range_end(self, queryset, name, value):
        return queryset.filter(start_datetime__lte=value)

    def filter_has_reminder(self, queryset, name, value):
        if value:
            return queryset.exclude(reminder_minutes_before__isnull=True)
        return queryset.filter(reminder_minutes_before__isnull=True)

    def filter_has_location(self, queryset, name, value):
        if value:
            return queryset.exclude(location='')
        return queryset.filter(location='')
