from django_filters import CharFilter, BooleanFilter, ChoiceFilter, DateTimeFilter

from apps.core.filters import TimestampedFilterSet
from apps.webhooks.models import Webhook, WebhookEvent


class WebhookFilter(TimestampedFilterSet):
    name = CharFilter(field_name='name', lookup_expr='icontains')
    event_type = ChoiceFilter(field_name='event_type', choices=Webhook.EVENT_CHOICES)
    is_active = BooleanFilter(field_name='is_active')
    endpoint_url = CharFilter(field_name='endpoint_url', lookup_expr='icontains')
    has_secret = BooleanFilter(method='filter_has_secret')

    class Meta:
        model = Webhook
        fields = ['name', 'event_type', 'is_active', 'endpoint_url', 'has_secret']
        ordering_fields = ['name', 'event_type', 'created_at', 'updated_at']

    def filter_has_secret(self, queryset, name, value):
        if value:
            return queryset.exclude(secret='')
        return queryset.filter(secret='')


class WebhookEventFilter(TimestampedFilterSet):
    webhook_id = CharFilter(field_name='webhook__id')
    webhook_name = CharFilter(field_name='webhook__name', lookup_expr='icontains')
    event_type = ChoiceFilter(field_name='event_type', choices=Webhook.EVENT_CHOICES)
    status = ChoiceFilter(field_name='status', choices=WebhookEvent.STATUS_CHOICES)
    checklist_instance_id = CharFilter(field_name='checklist_instance__id')
    has_response_code = BooleanFilter(method='filter_has_response_code')
    response_code = CharFilter(field_name='response_code')
    retry_count_gte = CharFilter(field_name='retry_count', lookup_expr='gte')
    sent_at_gte = DateTimeFilter(field_name='sent_at', lookup_expr='gte')
    sent_at_lte = DateTimeFilter(field_name='sent_at', lookup_expr='lte')
    pending_retry = BooleanFilter(method='filter_pending_retry')

    class Meta:
        model = WebhookEvent
        fields = [
            'webhook_id', 'webhook_name', 'event_type', 'status',
            'checklist_instance_id', 'has_response_code', 'response_code',
            'retry_count_gte', 'sent_at_gte', 'sent_at_lte', 'pending_retry'
        ]
        ordering_fields = ['created_at', 'updated_at', 'sent_at', 'retry_count']

    def filter_has_response_code(self, queryset, name, value):
        if value:
            return queryset.filter(response_code__isnull=False)
        return queryset.filter(response_code__isnull=True)

    def filter_pending_retry(self, queryset, name, value):
        if value:
            return queryset.filter(
                status='retrying',
                next_retry_at__isnull=False
            )
        return queryset.exclude(
            status='retrying',
            next_retry_at__isnull=False
        )
