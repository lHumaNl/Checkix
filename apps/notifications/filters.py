from django_filters import CharFilter, BooleanFilter, NumberFilter, DateTimeFilter, ChoiceFilter

from apps.core.filters import TimestampedFilterSet, SearchFilterSet, IDFilterSet
from apps.notifications.models import (
    DynamicDueDateRule,
    NotificationRule,
    NotificationSequence,
    NotificationLog
)


class NotificationRuleFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    checklist_template_id = CharFilter(field_name='checklist_template__id')
    checklist_item_id = CharFilter(field_name='checklist_item__id')
    assignment_id = CharFilter(field_name='assignment__id')
    event_type = ChoiceFilter(field_name='event_type', choices=NotificationRule.EVENT_CHOICES)
    event_type_in = CharFilter(method='filter_event_type_in')
    is_active = BooleanFilter(field_name='is_active')
    has_template = BooleanFilter(method='filter_has_template')
    has_item = BooleanFilter(method='filter_has_item')

    class Meta:
        model = NotificationRule
        fields = [
            'id', 'id_in', 'checklist_template_id', 'checklist_item_id',
            'assignment_id', 'event_type', 'event_type_in', 'is_active',
            'has_template', 'has_item'
        ]
        search_fields = ['event_type']
        ordering_fields = ['created_at', 'updated_at', 'event_type']

    def filter_event_type_in(self, queryset, name, value):
        if not value:
            return queryset
        event_types = [t.strip() for t in value.split(',') if t.strip()]
        return queryset.filter(event_type__in=event_types)

    def filter_has_template(self, queryset, name, value):
        if value:
            return queryset.filter(checklist_template__isnull=False)
        return queryset.filter(checklist_template__isnull=True)

    def filter_has_item(self, queryset, name, value):
        if value:
            return queryset.filter(checklist_item__isnull=False)
        return queryset.filter(checklist_item__isnull=True)


class NotificationSequenceFilter(TimestampedFilterSet, IDFilterSet):
    notification_rule_id = CharFilter(field_name='notification_rule__id')
    sequence_order = NumberFilter(field_name='sequence_order')
    sequence_order_gte = NumberFilter(field_name='sequence_order', lookup_expr='gte')
    sequence_order_lte = NumberFilter(field_name='sequence_order', lookup_expr='lte')
    recipient_type = ChoiceFilter(
        field_name='recipient_type',
        choices=NotificationSequence.RECIPIENT_TYPE_CHOICES
    )
    recipient_group_id = CharFilter(field_name='recipient_group__id')
    has_group = BooleanFilter(method='filter_has_group')
    trigger_offset_minutes_gte = NumberFilter(
        field_name='trigger_offset_minutes',
        lookup_expr='gte'
    )
    trigger_offset_minutes_lte = NumberFilter(
        field_name='trigger_offset_minutes',
        lookup_expr='lte'
    )

    class Meta:
        model = NotificationSequence
        fields = [
            'id', 'id_in', 'notification_rule_id', 'sequence_order',
            'sequence_order_gte', 'sequence_order_lte', 'recipient_type',
            'recipient_group_id', 'has_group', 'trigger_offset_minutes_gte',
            'trigger_offset_minutes_lte'
        ]
        ordering_fields = ['sequence_order', 'trigger_offset_minutes', 'created_at']

    def filter_has_group(self, queryset, name, value):
        if value:
            return queryset.filter(recipient_group__isnull=False)
        return queryset.filter(recipient_group__isnull=True)


class NotificationLogFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    notification_sequence_id = CharFilter(field_name='notification_sequence__id')
    notification_rule_id = CharFilter(method='filter_notification_rule_id')
    checklist_instance_id = CharFilter(field_name='checklist_instance__id')
    recipient_email = CharFilter(field_name='recipient_email', lookup_expr='icontains')
    status = ChoiceFilter(field_name='status', choices=NotificationLog.STATUS_CHOICES)
    status_in = CharFilter(method='filter_status_in')
    sent_at_gte = DateTimeFilter(field_name='sent_at', lookup_expr='gte')
    sent_at_lte = DateTimeFilter(field_name='sent_at', lookup_expr='lte')
    has_error = BooleanFilter(method='filter_has_error')

    class Meta:
        model = NotificationLog
        fields = [
            'id', 'id_in', 'notification_sequence_id', 'notification_rule_id',
            'checklist_instance_id', 'recipient_email', 'status', 'status_in',
            'sent_at_gte', 'sent_at_lte', 'has_error'
        ]
        search_fields = ['recipient_email', 'error_message']
        ordering_fields = ['created_at', 'updated_at', 'sent_at', 'status']

    def filter_notification_rule_id(self, queryset, name, value):
        return queryset.filter(
            notification_sequence__notification_rule__id=value
        )

    def filter_status_in(self, queryset, name, value):
        if not value:
            return queryset
        statuses = [s.strip() for s in value.split(',') if s.strip()]
        return queryset.filter(status__in=statuses)

    def filter_has_error(self, queryset, name, value):
        if value:
            return queryset.exclude(error_message='').filter(error_message__isnull=False)
        return queryset.filter(error_message='').filter(error_message__isnull=True)


class DynamicDueDateRuleFilter(TimestampedFilterSet, SearchFilterSet, IDFilterSet):
    checklist_template_id = CharFilter(field_name='checklist_template__id')
    checklist_item_id = CharFilter(field_name='checklist_item__id')
    trigger_type = ChoiceFilter(
        field_name='trigger_type',
        choices=DynamicDueDateRule.TRIGGER_TYPE_CHOICES
    )
    trigger_type_in = CharFilter(method='filter_trigger_type_in')
    business_days_only = BooleanFilter(field_name='business_days_only')
    offset_minutes_gte = NumberFilter(field_name='offset_minutes', lookup_expr='gte')
    offset_minutes_lte = NumberFilter(field_name='offset_minutes', lookup_expr='lte')
    trigger_parameter_name = CharFilter(
        field_name='trigger_parameter_name',
        lookup_expr='icontains'
    )
    has_template = BooleanFilter(method='filter_has_template')
    has_item = BooleanFilter(method='filter_has_item')

    class Meta:
        model = DynamicDueDateRule
        fields = [
            'id', 'id_in', 'checklist_template_id', 'checklist_item_id',
            'trigger_type', 'trigger_type_in', 'business_days_only',
            'offset_minutes_gte', 'offset_minutes_lte', 'trigger_parameter_name',
            'has_template', 'has_item'
        ]
        search_fields = ['trigger_parameter_name']
        ordering_fields = ['created_at', 'updated_at', 'offset_minutes']

    def filter_trigger_type_in(self, queryset, name, value):
        if not value:
            return queryset
        trigger_types = [t.strip() for t in value.split(',') if t.strip()]
        return queryset.filter(trigger_type__in=trigger_types)

    def filter_has_template(self, queryset, name, value):
        if value:
            return queryset.filter(checklist_template__isnull=False)
        return queryset.filter(checklist_template__isnull=True)

    def filter_has_item(self, queryset, name, value):
        if value:
            return queryset.filter(checklist_item__isnull=False)
        return queryset.filter(checklist_item__isnull=True)
