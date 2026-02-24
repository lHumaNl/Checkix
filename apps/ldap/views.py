from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.ldap.models import LDAPSyncLog
from apps.ldap.serializers import (
    LDAPSyncLogSerializer,
    LDAPSyncLogListSerializer,
    LDAPTestConnectionSerializer,
    LDAPTestConnectionResultSerializer,
    LDAPSyncNowSerializer,
    LDAPSyncResultSerializer,
    LDAPStatsSerializer,
)
from apps.ldap.filters import LDAPSyncLogFilter
from apps.ldap.backends import LDAPService


@extend_schema_view(
    list=extend_schema(
        summary='List all LDAP sync logs',
        description='Retrieve a list of all LDAP sync logs',
        tags=['LDAP']
    ),
    retrieve=extend_schema(
        summary='Retrieve an LDAP sync log',
        description='Get details of a specific LDAP sync log',
        tags=['LDAP']
    ),
)
class LDAPSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LDAPSyncLogSerializer
    filterset_class = LDAPSyncLogFilter
    permission_classes = [IsAdminUser]
    ordering_fields = ['started_at', 'completed_at', 'status', 'created_at']
    ordering = ['-started_at']

    def get_queryset(self):
        return LDAPSyncLog.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return LDAPSyncLogListSerializer
        return LDAPSyncLogSerializer


@extend_schema_view(
    list=extend_schema(
        summary='LDAP management endpoints',
        tags=['LDAP']
    ),
)
class LDAPManagementViewSet(viewsets.ViewSet):
    """
    ViewSet for LDAP management operations.
    All LDAP configuration is done via Django settings.
    """
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary='Test LDAP connection',
        description='Test the connection to the LDAP server',
        request=LDAPTestConnectionSerializer,
        responses={200: LDAPTestConnectionResultSerializer},
        tags=['LDAP']
    )
    @action(detail=False, methods=['post'])
    def test_connection(self, request):
        result = LDAPService.test_connection()
        serializer = LDAPTestConnectionResultSerializer(result)
        return Response(serializer.data)

    @extend_schema(
        summary='Sync users from LDAP',
        description='Synchronize users from LDAP server',
        request=LDAPSyncNowSerializer,
        responses={200: LDAPSyncResultSerializer},
        tags=['LDAP']
    )
    @action(detail=False, methods=['post'])
    def sync_users(self, request):
        result = LDAPService.sync_users()
        serializer = LDAPSyncResultSerializer(result)
        return Response(serializer.data)

    @extend_schema(
        summary='Get LDAP statistics',
        description='Get LDAP configuration and sync statistics',
        responses={200: LDAPStatsSerializer},
        tags=['LDAP']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats = LDAPService.get_stats()
        serializer = LDAPStatsSerializer(stats)
        return Response(serializer.data)
