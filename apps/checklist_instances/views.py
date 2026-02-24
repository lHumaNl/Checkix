from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from apps.checklist_instances.broadcasts import broadcast_instance_update, broadcast_item_toggle

from apps.checklist_instances.models import ChecklistInstance, ChecklistItemInstance, CompletionLog
from apps.checklist_instances.serializers import (
    ChecklistInstanceSerializer,
    ChecklistInstanceListSerializer,
    ChecklistInstanceCreateSerializer,
    ChecklistInstanceUpdateSerializer,
    ChecklistInstanceMinimalSerializer,
    ChecklistItemInstanceSerializer,
    ChecklistItemInstanceUpdateSerializer,
    ChecklistItemInstanceMinimalSerializer,
    CompletionLogSerializer,
    ApplyToTemplateSerializer,
)
from apps.checklist_instances.filters import ChecklistInstanceFilter, ChecklistItemInstanceFilter, CompletionLogFilter
from apps.checklist_instances.services import ChecklistInstanceService, CompletionLogService


@extend_schema_view(
    list=extend_schema(
        summary='List checklist instances',
        description='Retrieve a list of all checklist instances for the authenticated user',
        tags=['Checklist Instances']
    ),
    retrieve=extend_schema(
        summary='Retrieve a checklist instance',
        description='Get details of a specific checklist instance with nested items',
        tags=['Checklist Instances']
    ),
    create=extend_schema(
        summary='Create a checklist instance',
        description='Create a new checklist instance',
        tags=['Checklist Instances']
    ),
    update=extend_schema(
        summary='Update a checklist instance',
        description='Update an existing checklist instance',
        tags=['Checklist Instances']
    ),
    partial_update=extend_schema(
        summary='Partially update a checklist instance',
        description='Partially update an existing checklist instance',
        tags=['Checklist Instances']
    ),
    destroy=extend_schema(
        summary='Delete a checklist instance',
        description='Delete a checklist instance',
        tags=['Checklist Instances']
    ),
)
class ChecklistInstanceViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistInstanceSerializer
    filterset_class = ChecklistInstanceFilter
    search_fields = ['name', 'notes']
    ordering_fields = ['name', 'status', 'progress_percentage', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return ChecklistInstance.objects.filter(user=self.request.user).select_related(
            'template', 'version', 'user'
        ).prefetch_related('item_instances')

    def get_serializer_class(self):
        if self.action == 'create':
            return ChecklistInstanceCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ChecklistInstanceUpdateSerializer
        if self.action == 'list':
            return ChecklistInstanceListSerializer
        return ChecklistInstanceSerializer

    def perform_create(self, serializer):
        template = serializer.validated_data.get('template')
        if template:
            from apps.checklist_instances.services import ChecklistInstanceService
            instance = ChecklistInstanceService.create_from_template(
                user=self.request.user,
                template=template,
                version=serializer.validated_data.get('version'),
                name=serializer.validated_data.get('name'),
                notes=serializer.validated_data.get('notes', ''),
            )
            serializer.instance = instance
        else:
            serializer.save(user=self.request.user)

    @extend_schema(
        summary='Start a checklist instance',
        description='Change status to in_progress and record start time',
        responses={200: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        instance = self.get_object()

        if instance.status not in ['draft', 'paused']:
            return Response(
                {'error': 'Can only start instances in draft or paused status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'in_progress'
        if not instance.started_at:
            instance.started_at = timezone.now()
        instance.save()

        CompletionLogService.log_instance_status_change(instance, request.user, 'start')
        broadcast_instance_update(instance, 'started', request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Resume a paused checklist instance',
        description='Change status back to in_progress from paused',
        responses={200: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        instance = self.get_object()

        if instance.status != 'paused':
            return Response(
                {'error': 'Can only resume paused instances'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'in_progress'
        instance.save()

        CompletionLogService.log_instance_status_change(instance, request.user, 'resume')
        broadcast_instance_update(instance, 'resumed', request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Pause a checklist instance',
        description='Change status to paused',
        responses={200: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        instance = self.get_object()

        if instance.status != 'in_progress':
            return Response(
                {'error': 'Can only pause instances in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'paused'
        instance.save()

        CompletionLogService.log_instance_status_change(instance, request.user, 'pause')
        broadcast_instance_update(instance, 'paused', request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Complete a checklist instance',
        description='Change status to completed and record completion time',
        responses={200: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        instance = self.get_object()

        if instance.status not in ['in_progress', 'paused']:
            return Response(
                {'error': 'Can only complete instances in progress or paused'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'completed'
        instance.completed_at = timezone.now()
        instance.progress_percentage = 100
        instance.save()

        CompletionLogService.log_instance_status_change(instance, request.user, 'complete')
        broadcast_instance_update(instance, 'completed', request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Cancel a checklist instance',
        description='Change status to cancelled',
        responses={200: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        instance = self.get_object()

        if instance.status == 'completed':
            return Response(
                {'error': 'Cannot cancel a completed instance'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'cancelled'
        instance.save()

        CompletionLogService.log_instance_status_change(instance, request.user, 'cancel')
        broadcast_instance_update(instance, 'cancelled', request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Apply instance changes to template',
        description='Apply changes from this instance back to the original template',
        request=ApplyToTemplateSerializer,
        responses={200: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def apply_to_template(self, request, pk=None):
        instance = self.get_object()

        if not instance.template:
            return Response(
                {'error': 'Instance has no associated template'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ApplyToTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        create_new_version = serializer.validated_data.get('create_new_version', True)
        version_notes = serializer.validated_data.get('version_notes', '')

        try:
            ChecklistInstanceService.apply_to_template(
                instance,
                create_new_version=create_new_version,
                version_notes=version_notes
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        instance_ser = self.get_serializer(instance)
        return Response(instance_ser.data)

    @extend_schema(
        summary='Create instance from template',
        description='Create a new checklist instance from a template',
        request={'type': 'object', 'properties': {
            'template_id': {'type': 'string'},
            'version_id': {'type': 'string', 'nullable': True},
            'name': {'type': 'string'},
            'notes': {'type': 'string'}
        }},
        responses={201: ChecklistInstanceSerializer()},
        tags=['Checklist Instances']
    )
    @action(detail=False, methods=['post'])
    def from_template(self, request):
        template_id = request.data.get('template_id')
        version_id = request.data.get('version_id')
        name = request.data.get('name')
        notes = request.data.get('notes', '')

        if not template_id:
            return Response(
                {'error': 'template_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.checklists.models import ChecklistTemplate
            template = ChecklistTemplate.objects.get(id=template_id, user=request.user)
        except ChecklistTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        version = None
        if version_id:
            try:
                from apps.checklists.models import ChecklistVersion
                version = ChecklistVersion.objects.get(id=version_id, template=template)
            except ChecklistVersion.DoesNotExist:
                return Response(
                    {'error': 'Version not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        instance = ChecklistInstanceService.create_from_template(
            user=request.user,
            template=template,
            version=version,
            name=name,
            notes=notes
        )

        serializer = ChecklistInstanceSerializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Get completion logs',
        description='Get all completion logs for this instance',
        responses={200: CompletionLogSerializer(many=True)},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        instance = self.get_object()
        logs = instance.completion_logs.all()
        page = self.paginate_queryset(logs)
        if page is not None:
            serializer = CompletionLogSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = CompletionLogSerializer(logs, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Set placeholder value',
        description='Set a placeholder value and recalculate child item visibility',
        request={'type': 'object', 'properties': {
            'placeholder_key': {'type': 'string'},
            'value': {'type': 'string'},
        }, 'required': ['placeholder_key']},
        responses={200: OpenApiResponse(description='Placeholder updated')},
        tags=['Checklist Instances']
    )
    @action(detail=True, methods=['post'])
    def set_placeholder(self, request, pk=None):
        instance = self.get_object()
        placeholder_key = request.data.get('placeholder_key', '').strip()
        value = request.data.get('value', '')

        if not placeholder_key:
            return Response(
                {'error': 'placeholder_key is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ChecklistInstanceService.set_placeholder_value(instance, placeholder_key, value)
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary='Get instance statistics',
        description='Get statistics about checklist instances',
        responses={200: OpenApiResponse(description='Instance statistics')},
        tags=['Checklist Instances']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        by_status = {}
        for status_code, status_name in ChecklistInstance.STATUS_CHOICES:
            by_status[status_code] = queryset.filter(status=status_code).count()

        completed = queryset.filter(status='completed').count()
        in_progress = queryset.filter(status='in_progress').count()

        return Response({
            'total': total,
            'by_status': by_status,
            'completed': completed,
            'in_progress': in_progress,
        })


@extend_schema_view(
    list=extend_schema(
        summary='List checklist item instances',
        description='Retrieve a list of all checklist item instances',
        tags=['Checklist Item Instances']
    ),
    retrieve=extend_schema(
        summary='Retrieve a checklist item instance',
        description='Get details of a specific checklist item instance',
        tags=['Checklist Item Instances']
    ),
    update=extend_schema(
        summary='Update a checklist item instance',
        description='Update an existing checklist item instance',
        tags=['Checklist Item Instances']
    ),
    partial_update=extend_schema(
        summary='Partially update a checklist item instance',
        description='Partially update an existing checklist item instance',
        tags=['Checklist Item Instances']
    ),
)
class ChecklistItemInstanceViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistItemInstanceSerializer
    filterset_class = ChecklistItemInstanceFilter
    search_fields = ['title', 'description']
    ordering_fields = ['order', 'created_at', 'updated_at']
    ordering = ['order']

    def get_queryset(self):
        return ChecklistItemInstance.objects.filter(
            instance__user=self.request.user
        ).select_related('instance', 'item', 'parent').prefetch_related('children')

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return ChecklistItemInstanceUpdateSerializer
        return ChecklistItemInstanceSerializer

    @extend_schema(
        summary='Toggle item completion',
        description='Toggle the completion status of an item',
        request={'type': 'object', 'properties': {
            'is_completed': {'type': 'boolean'}
        }},
        responses={200: ChecklistItemInstanceSerializer()},
        tags=['Checklist Item Instances']
    )
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        item_instance = self.get_object()
        is_completed = request.data.get('is_completed', not item_instance.is_completed)

        item_instance.is_completed = is_completed
        if is_completed:
            item_instance.completed_at = timezone.now()
            action = 'complete'
        else:
            item_instance.completed_at = None
            action = 'uncomplete'
        item_instance.save()

        CompletionLogService.log_item_completion(
            item_instance, request.user, action
        )

        ChecklistInstanceService.update_progress(item_instance.instance)
        broadcast_item_toggle(item_instance, action, request.user)

        serializer = self.get_serializer(item_instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Update placeholder value',
        description='Update the placeholder value for an item',
        request={'type': 'object', 'properties': {
            'placeholder_value': {'type': 'string'}
        }},
        responses={200: ChecklistItemInstanceSerializer()},
        tags=['Checklist Item Instances']
    )
    @action(detail=True, methods=['post'])
    def update_placeholder(self, request, pk=None):
        item_instance = self.get_object()
        placeholder_value = request.data.get('placeholder_value', '')

        item_instance.placeholder_value = placeholder_value
        item_instance.save()

        serializer = self.get_serializer(item_instance)
        return Response(serializer.data)

    @extend_schema(
        summary='Reorder items',
        description='Update the order of multiple items',
        request={'type': 'object', 'properties': {
            'orders': {'type': 'array', 'items': {'type': 'object', 'properties': {
                'id': {'type': 'string'},
                'order': {'type': 'integer'}
            }}}
        }},
        responses={200: OpenApiResponse(description='Items reordered successfully')},
        tags=['Checklist Item Instances']
    )
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        orders = request.data.get('orders', [])
        if not orders:
            return Response(
                {'error': 'No order data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        for item in orders:
            item_id = item.get('id')
            order = item.get('order')
            if item_id and order is not None:
                self.get_queryset().filter(id=item_id).update(order=order)

        return Response({'message': 'Items reordered successfully'})


@extend_schema_view(
    list=extend_schema(
        summary='List completion logs',
        description='Retrieve a list of all completion logs',
        tags=['Completion Logs']
    ),
    retrieve=extend_schema(
        summary='Retrieve a completion log',
        description='Get details of a specific completion log',
        tags=['Completion Logs']
    ),
)
class CompletionLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CompletionLogSerializer
    filterset_class = CompletionLogFilter
    ordering_fields = ['timestamp', 'created_at']
    ordering = ['-timestamp']

    def get_queryset(self):
        return CompletionLog.objects.filter(
            instance__user=self.request.user
        ).select_related('instance', 'item_instance', 'user')
