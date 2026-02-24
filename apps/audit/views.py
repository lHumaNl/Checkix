from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.audit.models import AuditLog
from apps.audit.serializers import (
    AuditLogSerializer,
    AuditLogListSerializer,
    AuditLogMinimalSerializer,
    AuditLogCreateSerializer,
    AuditSummarySerializer,
)
from apps.audit.filters import AuditLogFilter
from apps.audit.services import AuditService


@extend_schema_view(
    list=extend_schema(
        summary='List all audit logs',
        description='Retrieve a list of all audit logs',
        tags=['Audit']
    ),
    retrieve=extend_schema(
        summary='Retrieve an audit log',
        description='Get details of a specific audit log',
        tags=['Audit']
    ),
)
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    filterset_class = AuditLogFilter
    search_fields = ['entity_name', 'user__email']
    ordering_fields = ['created_at', 'action', 'entity_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return AuditLog.objects.filter(
            user=self.request.user
        ).select_related('user', 'checklist_instance')

    def get_serializer_class(self):
        if self.action == 'list':
            return AuditLogListSerializer
        return AuditLogSerializer

    @extend_schema(
        summary='Get audit summary',
        description='Get a summary of audit activity',
        responses={200: AuditSummarySerializer()},
        tags=['Audit']
    )
    @action(detail=False, methods=['get'])
    def summary(self, request):
        try:
            days = int(request.query_params.get('days', 30))
        except (ValueError, TypeError):
            return Response({'detail': 'days must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        summary = AuditService.get_audit_summary(days=days)
        serializer = AuditSummarySerializer(summary)
        return Response(serializer.data)

    @extend_schema(
        summary='Get logs by entity',
        description='Get all audit logs for a specific entity',
        responses={200: AuditLogMinimalSerializer(many=True)},
        tags=['Audit']
    )
    @action(detail=False, methods=['get'])
    def by_entity(self, request):
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')

        if not entity_type or not entity_id:
            return Response(
                {'error': 'entity_type and entity_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            entity_id_int = int(entity_id)
        except (ValueError, TypeError):
            return Response({'detail': 'entity_id must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

        logs = AuditService.get_entity_audit_logs(entity_type, entity_id_int)
        serializer = AuditLogMinimalSerializer(logs, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get logs by user',
        description='Get all audit logs for a specific user',
        responses={200: AuditLogMinimalSerializer(many=True)},
        tags=['Audit']
    )
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        user_id = request.query_params.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        logs = AuditService.get_user_audit_logs(user)
        serializer = AuditLogMinimalSerializer(logs, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get action counts',
        description='Get counts of actions by type',
        responses={200: OpenApiResponse(description='Action counts')},
        tags=['Audit']
    )
    @action(detail=False, methods=['get'])
    def action_counts(self, request):
        from django.db.models import Count

        counts = dict(
            AuditLog.objects.values('action')
            .annotate(count=Count('action'))
            .values_list('action', 'count')
        )
        return Response(counts)

    @extend_schema(
        summary='Cleanup old logs',
        description='Delete audit logs older than specified days',
        request={'type': 'object', 'properties': {'days': {'type': 'integer', 'default': 90}}},
        responses={200: OpenApiResponse(description='Number of deleted logs')},
        tags=['Audit']
    )
    @action(detail=False, methods=['post'])
    def cleanup(self, request):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        days = int(request.data.get('days', 90))
        deleted_count = AuditService.cleanup_old_logs(days_to_keep=days)
        return Response({'deleted_count': deleted_count})
