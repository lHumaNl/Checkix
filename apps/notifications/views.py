from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.notifications.models import (
    DynamicDueDateRule,
    NotificationRule,
    NotificationSequence,
    NotificationLog
)
from apps.notifications.serializers import (
    NotificationRuleSerializer,
    NotificationRuleListSerializer,
    NotificationRuleCreateSerializer,
    NotificationRuleUpdateSerializer,
    NotificationSequenceSerializer,
    NotificationSequenceCreateSerializer,
    NotificationSequenceUpdateSerializer,
    NotificationLogSerializer,
    NotificationLogListSerializer,
    DynamicDueDateRuleSerializer,
    DynamicDueDateRuleListSerializer,
    DynamicDueDateRuleCreateSerializer,
    DynamicDueDateRuleUpdateSerializer,
)
from apps.notifications.filters import (
    NotificationRuleFilter,
    NotificationSequenceFilter,
    NotificationLogFilter,
    DynamicDueDateRuleFilter
)
from apps.notifications.services import NotificationService


@extend_schema_view(
    list=extend_schema(
        summary='List all notification rules',
        description='Retrieve a list of all notification rules',
        tags=['Notifications']
    ),
    retrieve=extend_schema(
        summary='Retrieve a notification rule',
        description='Get details of a specific notification rule with sequences',
        tags=['Notifications']
    ),
    create=extend_schema(
        summary='Create a notification rule',
        description='Create a new notification rule with optional sequences',
        tags=['Notifications']
    ),
    update=extend_schema(
        summary='Update a notification rule',
        description='Update an existing notification rule',
        tags=['Notifications']
    ),
    partial_update=extend_schema(
        summary='Partially update a notification rule',
        description='Partially update an existing notification rule',
        tags=['Notifications']
    ),
    destroy=extend_schema(
        summary='Delete a notification rule',
        description='Delete a notification rule and all its sequences',
        tags=['Notifications']
    ),
)
class NotificationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationRuleSerializer
    filterset_class = NotificationRuleFilter
    search_fields = ['event_type']
    ordering_fields = ['created_at', 'updated_at', 'event_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return NotificationRule.objects.filter(
            created_by=self.request.user
        ).select_related(
            'checklist_template', 'checklist_item'
        ).prefetch_related('sequences')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return NotificationRuleCreateSerializer
        if self.action in ['update', 'partial_update']:
            return NotificationRuleUpdateSerializer
        if self.action == 'list':
            return NotificationRuleListSerializer
        return NotificationRuleSerializer

    @extend_schema(
        summary='Get sequences for a notification rule',
        description='Get all sequences for a specific notification rule',
        responses={200: NotificationSequenceSerializer(many=True)},
        tags=['Notifications']
    )
    @action(detail=True, methods=['get'])
    def sequences(self, request, pk=None):
        rule = self.get_object()
        sequences = rule.sequences.all()
        serializer = NotificationSequenceSerializer(sequences, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Add a sequence to notification rule',
        description='Add a new sequence to an existing notification rule',
        request=NotificationSequenceCreateSerializer,
        responses={201: NotificationSequenceSerializer()},
        tags=['Notifications']
    )
    @action(detail=True, methods=['post'])
    def add_sequence(self, request, pk=None):
        rule = self.get_object()
        serializer = NotificationSequenceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sequence = NotificationSequence.objects.create(
            notification_rule=rule,
            **serializer.validated_data
        )
        output_serializer = NotificationSequenceSerializer(sequence)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Toggle active status',
        description='Toggle the active status of a notification rule',
        responses={200: NotificationRuleSerializer()},
        tags=['Notifications']
    )
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save()
        serializer = NotificationRuleSerializer(rule)
        return Response(serializer.data)

    @extend_schema(
        summary='Get notification rule statistics',
        description='Get statistics about notification rules',
        responses={200: OpenApiResponse(description='Notification rule statistics')},
        tags=['Notifications']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        active = queryset.filter(is_active=True).count()
        by_event_type = {}
        for event_type, _ in NotificationRule.EVENT_CHOICES:
            by_event_type[event_type] = queryset.filter(event_type=event_type).count()

        return Response({
            'total_rules': total,
            'active_rules': active,
            'inactive_rules': total - active,
            'by_event_type': by_event_type,
        })


@extend_schema_view(
    list=extend_schema(
        summary='List all notification logs',
        description='Retrieve a list of all notification logs',
        tags=['Notifications']
    ),
    retrieve=extend_schema(
        summary='Retrieve a notification log',
        description='Get details of a specific notification log',
        tags=['Notifications']
    ),
)
class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationLogSerializer
    filterset_class = NotificationLogFilter
    search_fields = ['recipient_email', 'error_message']
    ordering_fields = ['created_at', 'updated_at', 'sent_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return NotificationLog.objects.filter(
            notification_sequence__notification_rule__created_by=self.request.user
        ).select_related(
            'notification_sequence__notification_rule',
            'checklist_instance'
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return NotificationLogListSerializer
        return NotificationLogSerializer

    @extend_schema(
        summary='Get notification log statistics',
        description='Get statistics about notification logs',
        responses={200: OpenApiResponse(description='Notification log statistics')},
        tags=['Notifications']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        pending = queryset.filter(status='pending').count()
        sent = queryset.filter(status='sent').count()
        failed = queryset.filter(status='failed').count()

        return Response({
            'total_logs': total,
            'pending': pending,
            'sent': sent,
            'failed': failed,
            'success_rate': round((sent / total * 100), 2) if total > 0 else 0,
        })

    @extend_schema(
        summary='Retry failed notification',
        description='Retry a failed notification',
        responses={200: NotificationLogSerializer()},
        tags=['Notifications']
    )
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        log = self.get_object()
        if log.status != 'failed':
            return Response(
                {'error': 'Only failed notifications can be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            NotificationService.retry_notification(log)
            log.refresh_from_db()
            serializer = NotificationLogSerializer(log)
            return Response(serializer.data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to retry notification {log.id}: {e}")
            return Response(
                {'error': 'Failed to retry notification. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema_view(
    list=extend_schema(
        summary='List all dynamic due date rules',
        description='Retrieve a list of all dynamic due date rules',
        tags=['Notifications']
    ),
    retrieve=extend_schema(
        summary='Retrieve a dynamic due date rule',
        description='Get details of a specific dynamic due date rule',
        tags=['Notifications']
    ),
    create=extend_schema(
        summary='Create a dynamic due date rule',
        description='Create a new dynamic due date rule',
        tags=['Notifications']
    ),
    update=extend_schema(
        summary='Update a dynamic due date rule',
        description='Update an existing dynamic due date rule',
        tags=['Notifications']
    ),
    partial_update=extend_schema(
        summary='Partially update a dynamic due date rule',
        description='Partially update an existing dynamic due date rule',
        tags=['Notifications']
    ),
    destroy=extend_schema(
        summary='Delete a dynamic due date rule',
        description='Delete a dynamic due date rule',
        tags=['Notifications']
    ),
)
class DynamicDueDateRuleViewSet(viewsets.ModelViewSet):
    serializer_class = DynamicDueDateRuleSerializer
    filterset_class = DynamicDueDateRuleFilter
    search_fields = ['trigger_parameter_name']
    ordering_fields = ['created_at', 'updated_at', 'offset_minutes']
    ordering = ['-created_at']

    def get_queryset(self):
        return DynamicDueDateRule.objects.filter(
            created_by=self.request.user
        ).select_related(
            'checklist_template', 'checklist_item'
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return DynamicDueDateRuleCreateSerializer
        if self.action in ['update', 'partial_update']:
            return DynamicDueDateRuleUpdateSerializer
        if self.action == 'list':
            return DynamicDueDateRuleListSerializer
        return DynamicDueDateRuleSerializer

    @extend_schema(
        summary='Get dynamic due date rule statistics',
        description='Get statistics about dynamic due date rules',
        responses={200: OpenApiResponse(description='Dynamic due date rule statistics')},
        tags=['Notifications']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        business_days = queryset.filter(business_days_only=True).count()
        by_trigger_type = {}
        for trigger_type, _ in DynamicDueDateRule.TRIGGER_TYPE_CHOICES:
            by_trigger_type[trigger_type] = queryset.filter(trigger_type=trigger_type).count()

        return Response({
            'total_rules': total,
            'business_days_only_count': business_days,
            'by_trigger_type': by_trigger_type,
        })


@extend_schema_view(
    list=extend_schema(
        summary='List all notification sequences',
        description='Retrieve a list of all notification sequences',
        tags=['Notifications']
    ),
    retrieve=extend_schema(
        summary='Retrieve a notification sequence',
        description='Get details of a specific notification sequence',
        tags=['Notifications']
    ),
    update=extend_schema(
        summary='Update a notification sequence',
        description='Update an existing notification sequence',
        tags=['Notifications']
    ),
    partial_update=extend_schema(
        summary='Partially update a notification sequence',
        description='Partially update an existing notification sequence',
        tags=['Notifications']
    ),
    destroy=extend_schema(
        summary='Delete a notification sequence',
        description='Delete a notification sequence',
        tags=['Notifications']
    ),
)
class NotificationSequenceViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSequenceSerializer
    filterset_class = NotificationSequenceFilter
    ordering_fields = ['sequence_order', 'trigger_offset_minutes', 'created_at']
    ordering = ['sequence_order']

    def get_queryset(self):
        return NotificationSequence.objects.filter(
            notification_rule__created_by=self.request.user
        ).select_related(
            'notification_rule', 'recipient_group'
        )

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return NotificationSequenceUpdateSerializer
        return NotificationSequenceSerializer
