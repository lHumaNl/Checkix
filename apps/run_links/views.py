from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.run_links.models import RunLink
from apps.run_links.serializers import (
    RunLinkSerializer,
    RunLinkListSerializer,
    RunLinkCreateSerializer,
    RunLinkUpdateSerializer,
    RunLinkMinimalSerializer,
    RunLinkExecuteSerializer,
)
from apps.run_links.filters import RunLinkFilter
from apps.run_links.services import RunLinkService


@extend_schema_view(
    list=extend_schema(
        summary='List all run links',
        description='Retrieve a list of all run links for the authenticated user',
        tags=['Run Links']
    ),
    retrieve=extend_schema(
        summary='Retrieve a run link',
        description='Get details of a specific run link',
        tags=['Run Links']
    ),
    create=extend_schema(
        summary='Create a run link',
        description='Create a new run link for a checklist template',
        tags=['Run Links']
    ),
    update=extend_schema(
        summary='Update a run link',
        description='Update an existing run link',
        tags=['Run Links']
    ),
    partial_update=extend_schema(
        summary='Partially update a run link',
        description='Partially update an existing run link',
        tags=['Run Links']
    ),
    destroy=extend_schema(
        summary='Delete a run link',
        description='Delete a run link',
        tags=['Run Links']
    ),
)
class RunLinkViewSet(viewsets.ModelViewSet):
    serializer_class = RunLinkSerializer
    filterset_class = RunLinkFilter
    search_fields = ['name', 'checklist_template__name']
    ordering_fields = ['name', 'created_at', 'usage_count', 'expires_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return RunLink.objects.filter(
            created_by=self.request.user
        ).select_related(
            'checklist_template', 'created_by'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return RunLinkCreateSerializer
        if self.action in ['update', 'partial_update']:
            return RunLinkUpdateSerializer
        if self.action == 'list':
            return RunLinkListSerializer
        return RunLinkSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @extend_schema(
        summary='Execute a run link',
        description='Create a checklist instance from a run link',
        request=RunLinkExecuteSerializer(),
        responses={201: OpenApiResponse(description='Checklist instance created')},
        tags=['Run Links']
    )
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        run_link = self.get_object()

        if not run_link.is_valid:
            if run_link.is_expired:
                return Response(
                    {'error': 'Run link has expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if run_link.is_max_uses_reached:
                return Response(
                    {'error': 'Run link has reached maximum usage'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        preset_overrides = request.data.get('preset_overrides', {})

        try:
            instance = RunLinkService.execute_run_link(
                unique_id=run_link.unique_id,
                preset_overrides=preset_overrides,
            )
            return Response(
                {'message': 'Checklist instance created', 'instance_id': str(instance.id)},
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary='Execute run link by UUID',
        description='Create a checklist instance using the run link UUID',
        request=RunLinkExecuteSerializer(),
        responses={201: OpenApiResponse(description='Checklist instance created')},
        tags=['Run Links']
    )
    @action(detail=False, methods=['post'], url_path='execute/(?P<unique_id>[0-9a-f-]+)')
    def execute_by_uuid(self, request, unique_id=None):
        preset_overrides = request.data.get('preset_overrides', {})

        try:
            instance = RunLinkService.execute_run_link(
                unique_id=unique_id,
                preset_overrides=preset_overrides,
            )
            return Response(
                {'message': 'Checklist instance created', 'instance_id': str(instance.id)},
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary='Get run link stats',
        description='Get statistics for a run link',
        responses={200: OpenApiResponse(description='Run link statistics')},
        tags=['Run Links']
    )
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        run_link = self.get_object()
        stats = RunLinkService.get_run_link_stats(run_link)
        return Response(stats)

    @extend_schema(
        summary='Regenerate unique ID',
        description='Generate a new unique ID for the run link',
        responses={200: RunLinkSerializer()},
        tags=['Run Links']
    )
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        run_link = self.get_object()
        run_link = RunLinkService.regenerate_unique_id(run_link)
        serializer = self.get_serializer(run_link)
        return Response(serializer.data)

    @extend_schema(
        summary='Get valid run links',
        description='Get all valid (non-expired, under max uses) run links',
        responses={200: RunLinkMinimalSerializer(many=True)},
        tags=['Run Links']
    )
    @action(detail=False, methods=['get'])
    def valid(self, request):
        from django.db.models import Q
        from django.utils import timezone as tz
        now = tz.now()
        queryset = self.get_queryset().filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        ).exclude(
            max_uses__isnull=False,
            usage_count__gte=models.F('max_uses')
        )
        serializer = RunLinkMinimalSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get expired run links',
        description='Get all expired run links',
        responses={200: RunLinkMinimalSerializer(many=True)},
        tags=['Run Links']
    )
    @action(detail=False, methods=['get'])
    def expired(self, request):
        from django.utils import timezone as tz
        now = tz.now()
        queryset = self.get_queryset().filter(expires_at__lte=now)
        serializer = RunLinkMinimalSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get run links by template',
        description='Get all run links for a specific template',
        responses={200: RunLinkListSerializer(many=True)},
        tags=['Run Links']
    )
    @action(detail=False, methods=['get'])
    def by_template(self, request):
        template_id = request.query_params.get('template_id')

        if not template_id:
            return Response(
                {'error': 'template_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.checklists.models import ChecklistTemplate

        try:
            template = ChecklistTemplate.objects.get(id=template_id)
        except ChecklistTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        links = RunLinkService.get_template_run_links(template)
        serializer = RunLinkListSerializer(links, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Cleanup expired links',
        description='Delete all expired run links',
        responses={200: OpenApiResponse(description='Number of deleted links')},
        tags=['Run Links']
    )
    @action(detail=False, methods=['post'])
    def cleanup_expired(self, request):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        count = RunLinkService.cleanup_expired_links()
        return Response({'deleted_count': count})
