from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.webhooks.models import Webhook, WebhookEvent
from apps.webhooks.serializers import (
    WebhookSerializer,
    WebhookListSerializer,
    WebhookCreateSerializer,
    WebhookUpdateSerializer,
    WebhookTestSerializer,
    WebhookTestResultSerializer,
    WebhookEventSerializer,
    WebhookEventListSerializer,
)
from apps.webhooks.filters import WebhookFilter, WebhookEventFilter
from apps.webhooks.services import WebhookService


@extend_schema_view(
    list=extend_schema(
        summary='List all webhooks',
        description='Retrieve a list of all webhooks for the authenticated user',
        tags=['Webhooks']
    ),
    retrieve=extend_schema(
        summary='Retrieve a webhook',
        description='Get details of a specific webhook',
        tags=['Webhooks']
    ),
    create=extend_schema(
        summary='Create a webhook',
        description='Create a new webhook for the authenticated user',
        tags=['Webhooks']
    ),
    update=extend_schema(
        summary='Update a webhook',
        description='Update an existing webhook',
        tags=['Webhooks']
    ),
    partial_update=extend_schema(
        summary='Partially update a webhook',
        description='Partially update an existing webhook',
        tags=['Webhooks']
    ),
    destroy=extend_schema(
        summary='Delete a webhook',
        description='Delete a webhook',
        tags=['Webhooks']
    ),
)
class WebhookViewSet(viewsets.ModelViewSet):
    serializer_class = WebhookSerializer
    filterset_class = WebhookFilter
    search_fields = ['name', 'endpoint_url']
    ordering_fields = ['name', 'event_type', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Webhook.objects.filter(user=self.request.user).prefetch_related('events')

    def get_serializer_class(self):
        if self.action == 'create':
            return WebhookCreateSerializer
        if self.action in ['update', 'partial_update']:
            return WebhookUpdateSerializer
        if self.action == 'list':
            return WebhookListSerializer
        return WebhookSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary='Test a webhook',
        description='Send a test payload to the webhook endpoint',
        request=WebhookTestSerializer,
        responses={200: WebhookTestResultSerializer},
        tags=['Webhooks']
    )
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        webhook = self.get_object()
        result = WebhookService.test_webhook(webhook)
        serializer = WebhookTestResultSerializer(result)
        return Response(serializer.data)

    @extend_schema(
        summary='Get webhook events',
        description='Retrieve all events for a specific webhook',
        responses={200: WebhookEventListSerializer(many=True)},
        tags=['Webhooks']
    )
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        webhook = self.get_object()
        events = webhook.events.all()
        
        page = self.paginate_queryset(events)
        if page is not None:
            serializer = WebhookEventListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = WebhookEventListSerializer(events, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Regenerate webhook secret',
        description='Generate a new secret for webhook signature verification',
        responses={200: WebhookSerializer},
        tags=['Webhooks']
    )
    @action(detail=True, methods=['post'])
    def regenerate_secret(self, request, pk=None):
        webhook = self.get_object()
        import secrets
        webhook.secret = secrets.token_hex(32)
        webhook.save(update_fields=['secret'])
        serializer = WebhookSerializer(webhook)
        return Response(serializer.data)

    @extend_schema(
        summary='Get webhook statistics',
        description='Get statistics for all webhooks',
        responses={200: OpenApiResponse(description='Webhook statistics')},
        tags=['Webhooks']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        
        total = queryset.count()
        active = queryset.filter(is_active=True).count()
        
        total_events = WebhookEvent.objects.filter(
            webhook__user=request.user
        ).count()
        
        successful_events = WebhookEvent.objects.filter(
            webhook__user=request.user,
            status='sent'
        ).count()
        
        failed_events = WebhookEvent.objects.filter(
            webhook__user=request.user,
            status='failed'
        ).count()
        
        pending_events = WebhookEvent.objects.filter(
            webhook__user=request.user,
            status__in=['pending', 'retrying']
        ).count()
        
        return Response({
            'total_webhooks': total,
            'active_webhooks': active,
            'inactive_webhooks': total - active,
            'total_events': total_events,
            'successful_events': successful_events,
            'failed_events': failed_events,
            'pending_events': pending_events,
            'success_rate': round(successful_events / total_events * 100, 2) if total_events > 0 else 0,
        })

    @extend_schema(
        summary='Get webhooks by event type',
        description='Get all webhooks for a specific event type',
        responses={200: WebhookListSerializer(many=True)},
        tags=['Webhooks']
    )
    @action(detail=False, methods=['get'])
    def by_event_type(self, request):
        event_type = request.query_params.get('event_type')
        if not event_type:
            return Response(
                {'error': 'event_type parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        webhooks = self.get_queryset().filter(event_type=event_type)
        serializer = WebhookListSerializer(webhooks, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary='List all webhook events',
        description='Retrieve a list of all webhook events for the authenticated user',
        tags=['Webhook Events']
    ),
    retrieve=extend_schema(
        summary='Retrieve a webhook event',
        description='Get details of a specific webhook event',
        tags=['Webhook Events']
    ),
)
class WebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WebhookEventSerializer
    filterset_class = WebhookEventFilter
    ordering_fields = ['created_at', 'sent_at', 'retry_count']
    ordering = ['-created_at']

    def get_queryset(self):
        return WebhookEvent.objects.filter(
            webhook__user=self.request.user
        ).select_related('webhook', 'checklist_instance')

    def get_serializer_class(self):
        if self.action == 'list':
            return WebhookEventListSerializer
        return WebhookEventSerializer

    @extend_schema(
        summary='Retry a failed webhook event',
        description='Manually retry a failed webhook event',
        responses={200: WebhookEventSerializer},
        tags=['Webhook Events']
    )
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        event = self.get_object()
        
        if event.status not in ['failed', 'retrying']:
            return Response(
                {'error': 'Only failed or retrying events can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.status = 'retrying'
        event.next_retry_at = None
        event.save(update_fields=['status', 'next_retry_at'])
        
        from apps.webhooks.tasks import deliver_webhook
        deliver_webhook.delay(event.id)
        
        serializer = WebhookEventSerializer(event)
        return Response(serializer.data)

    @extend_schema(
        summary='Get event payload',
        description='Get the full payload of a webhook event',
        responses={200: OpenApiResponse(description='Event payload')},
        tags=['Webhook Events']
    )
    @action(detail=True, methods=['get'])
    def payload(self, request, pk=None):
        event = self.get_object()
        return Response(event.payload)
