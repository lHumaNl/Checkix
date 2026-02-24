from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.webhooks.models import Webhook, WebhookEvent


class WebhookEventSerializer(BaseModelSerializer):
    webhook_name = serializers.CharField(source='webhook.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    checklist_instance_name = serializers.CharField(
        source='checklist_instance.name', 
        read_only=True, 
        allow_null=True
    )

    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'webhook', 'webhook_name', 'checklist_instance', 
            'checklist_instance_name', 'event_type', 'payload', 'status',
            'status_display', 'response_code', 'response_body', 'retry_count',
            'max_retries', 'next_retry_at', 'sent_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'webhook', 'checklist_instance', 'event_type', 'payload',
            'status', 'response_code', 'response_body', 'retry_count',
            'max_retries', 'next_retry_at', 'sent_at', 'created_at', 'updated_at'
        ]


class WebhookEventListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    checklist_instance_name = serializers.CharField(
        source='checklist_instance.name', 
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'checklist_instance', 'checklist_instance_name', 'event_type',
            'status', 'status_display', 'response_code', 'retry_count',
            'sent_at', 'created_at'
        ]


class WebhookSerializer(BaseModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    events_count = serializers.SerializerMethodField()
    recent_events = serializers.SerializerMethodField()

    class Meta:
        model = Webhook
        fields = [
            'id', 'name', 'user', 'event_type', 'event_type_display',
            'endpoint_url', 'is_active', 'headers', 'events_count',
            'recent_events', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_events_count(self, obj):
        return obj.events.count()

    def get_recent_events(self, obj):
        recent = obj.events.all()[:5]
        return WebhookEventListSerializer(recent, many=True).data


class WebhookListSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    events_count = serializers.SerializerMethodField()
    last_event_status = serializers.SerializerMethodField()

    class Meta:
        model = Webhook
        fields = [
            'id', 'name', 'event_type', 'event_type_display', 'endpoint_url',
            'is_active', 'events_count', 'last_event_status', 'created_at', 'updated_at'
        ]

    def get_events_count(self, obj):
        return obj.events.count()

    def get_last_event_status(self, obj):
        last_event = obj.events.first()
        return last_event.status if last_event else None


class WebhookCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ['name', 'event_type', 'endpoint_url', 'secret', 'is_active', 'headers']
        extra_kwargs = {
            'secret': {'required': False, 'allow_blank': True, 'write_only': True},
            'headers': {'required': False},
            'is_active': {'required': False},
        }

    def validate_headers(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Headers must be a valid JSON object.')
        return value

    def validate_endpoint_url(self, value):
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('Endpoint URL must start with http:// or https://')
        return value


class WebhookUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ['name', 'event_type', 'endpoint_url', 'secret', 'is_active', 'headers']
        extra_kwargs = {
            'name': {'required': False},
            'event_type': {'required': False},
            'endpoint_url': {'required': False},
            'secret': {'required': False, 'allow_blank': True, 'write_only': True},
            'is_active': {'required': False},
            'headers': {'required': False},
        }

    def validate_headers(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Headers must be a valid JSON object.')
        return value

    def validate_endpoint_url(self, value):
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('Endpoint URL must start with http:// or https://')
        return value


class WebhookTestSerializer(serializers.Serializer):
    pass


class WebhookTestResultSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    response_code = serializers.IntegerField(allow_null=True)
    response_body = serializers.CharField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)
    duration_ms = serializers.FloatField()
