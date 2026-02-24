from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.assignments.models import Assignment
from apps.assignments.serializers import (
    AssignmentSerializer,
    AssignmentListSerializer,
    AssignmentCreateSerializer,
    AssignmentUpdateSerializer,
    AssignmentMinimalSerializer,
    ResolvedAssigneeSerializer,
)
from apps.assignments.filters import AssignmentFilter
from apps.assignments.services import AssignmentService


@extend_schema_view(
    list=extend_schema(
        summary='List all assignments',
        description='Retrieve a list of all assignments',
        tags=['Assignments']
    ),
    retrieve=extend_schema(
        summary='Retrieve an assignment',
        description='Get details of a specific assignment',
        tags=['Assignments']
    ),
    create=extend_schema(
        summary='Create an assignment',
        description='Create a new assignment',
        tags=['Assignments']
    ),
    update=extend_schema(
        summary='Update an assignment',
        description='Update an existing assignment',
        tags=['Assignments']
    ),
    partial_update=extend_schema(
        summary='Partially update an assignment',
        description='Partially update an existing assignment',
        tags=['Assignments']
    ),
    destroy=extend_schema(
        summary='Delete an assignment',
        description='Delete an assignment',
        tags=['Assignments']
    ),
)
class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    filterset_class = AssignmentFilter
    search_fields = ['assignee_parameter', 'checklist_template__name', 'checklist_item__title']
    ordering_fields = ['created_at', 'updated_at', 'assignment_type', 'assignee_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return Assignment.objects.filter(
            user=self.request.user
        ).select_related(
            'checklist_template', 'checklist_item', 'checklist_instance',
            'assignee_user', 'assignee_group'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return AssignmentCreateSerializer
        if self.action in ['update', 'partial_update']:
            return AssignmentUpdateSerializer
        if self.action == 'list':
            return AssignmentListSerializer
        return AssignmentSerializer

    @extend_schema(
        summary='Get assignments by template',
        description='Get all assignments for a specific checklist template',
        responses={200: AssignmentMinimalSerializer(many=True)},
        tags=['Assignments']
    )
    @action(detail=False, methods=['get'])
    def by_template(self, request):
        template_id = request.query_params.get('template_id')
        if not template_id:
            return Response(
                {'error': 'template_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignments = self.get_queryset().filter(
            assignment_type='template',
            checklist_template_id=template_id
        )
        serializer = AssignmentMinimalSerializer(assignments, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get assignments by instance',
        description='Get all assignments for a specific checklist instance',
        responses={200: AssignmentMinimalSerializer(many=True)},
        tags=['Assignments']
    )
    @action(detail=False, methods=['get'])
    def by_instance(self, request):
        instance_id = request.query_params.get('instance_id')
        if not instance_id:
            return Response(
                {'error': 'instance_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignments = self.get_queryset().filter(
            assignment_type='runtime',
            checklist_instance_id=instance_id
        )
        serializer = AssignmentMinimalSerializer(assignments, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get assignments by user',
        description='Get all assignments for a specific user (direct and group)',
        responses={200: OpenApiResponse(description='User assignments grouped by type')},
        tags=['Assignments']
    )
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        user = request.user

        user_assignments = AssignmentService.get_user_assignments(user)
        
        direct_serializer = AssignmentMinimalSerializer(
            user_assignments['direct'], many=True
        )
        group_serializer = AssignmentMinimalSerializer(
            user_assignments['group'], many=True
        )
        
        return Response({
            'direct': direct_serializer.data,
            'group': group_serializer.data,
        })

    @extend_schema(
        summary='Resolve assignees for template',
        description='Get resolved assignees for a template with optional placeholder values',
        request={'type': 'object', 'properties': {'placeholder_values': {'type': 'object'}}},
        responses={200: ResolvedAssigneeSerializer(many=True)},
        tags=['Assignments']
    )
    @action(detail=False, methods=['post'])
    def resolve_template(self, request):
        template_id = request.data.get('template_id')
        placeholder_values = request.data.get('placeholder_values', {})
        
        if not template_id:
            return Response(
                {'error': 'template_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.checklists.models import ChecklistTemplate
        try:
            template = ChecklistTemplate.objects.get(id=template_id, user=request.user)
        except ChecklistTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        users = AssignmentService.resolve_assignees_for_template(
            template, placeholder_values
        )
        
        resolved_data = []
        for user in users:
            assignment = Assignment.objects.filter(
                assignment_type='template',
                checklist_template=template,
                assignee_user=user
            ).first()
            
            resolved_data.append({
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'assignment_source': 'template',
                'is_exclusive': assignment.is_exclusive if assignment else False,
            })
        
        serializer = ResolvedAssigneeSerializer(data=resolved_data, many=True)
        serializer.is_valid()
        return Response(serializer.data)

    @extend_schema(
        summary='Resolve assignees for instance',
        description='Get resolved assignees for an instance with optional placeholder values',
        request={'type': 'object', 'properties': {'placeholder_values': {'type': 'object'}}},
        responses={200: ResolvedAssigneeSerializer(many=True)},
        tags=['Assignments']
    )
    @action(detail=False, methods=['post'])
    def resolve_instance(self, request):
        instance_id = request.data.get('instance_id')
        placeholder_values = request.data.get('placeholder_values', {})
        
        if not instance_id:
            return Response(
                {'error': 'instance_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.checklist_instances.models import ChecklistInstance
        try:
            instance = ChecklistInstance.objects.get(id=instance_id, user=request.user)
        except ChecklistInstance.DoesNotExist:
            return Response(
                {'error': 'Instance not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        users = AssignmentService.resolve_assignees_for_instance(
            instance, placeholder_values
        )
        
        resolved_data = []
        for user in users:
            assignment = Assignment.objects.filter(
                assignment_type='runtime',
                checklist_instance=instance,
                assignee_user=user
            ).first()
            
            resolved_data.append({
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'assignment_source': 'instance',
                'is_exclusive': assignment.is_exclusive if assignment else False,
            })
        
        serializer = ResolvedAssigneeSerializer(data=resolved_data, many=True)
        serializer.is_valid()
        return Response(serializer.data)

    @extend_schema(
        summary='Get assignment statistics',
        description='Get statistics about assignments',
        responses={200: OpenApiResponse(description='Assignment statistics')},
        tags=['Assignments']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        
        total = queryset.count()
        by_type = {
            'template': queryset.filter(assignment_type='template').count(),
            'item': queryset.filter(assignment_type='item').count(),
            'runtime': queryset.filter(assignment_type='runtime').count(),
        }
        by_assignee_type = {
            'user': queryset.filter(assignee_type='user').count(),
            'group': queryset.filter(assignee_type='group').count(),
            'parameter': queryset.filter(assignee_type='parameter').count(),
            'manager': queryset.filter(assignee_type='manager').count(),
        }
        exclusive_count = queryset.filter(is_exclusive=True).count()
        auto_notify_count = queryset.filter(auto_notify=True).count()
        
        return Response({
            'total': total,
            'by_assignment_type': by_type,
            'by_assignee_type': by_assignee_type,
            'exclusive_count': exclusive_count,
            'auto_notify_count': auto_notify_count,
        })

    @extend_schema(
        summary='Bulk create assignments',
        description='Create multiple assignments at once',
        request={'type': 'object', 'properties': {'assignments': {'type': 'array', 'items': {'$ref': '#/components/schemas/AssignmentCreate'}}}},
        responses={201: AssignmentSerializer(many=True)},
        tags=['Assignments']
    )
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        assignments_data = request.data.get('assignments', [])
        if not assignments_data:
            return Response(
                {'error': 'No assignments provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_assignments = []
        serializer = AssignmentCreateSerializer(data=assignments_data, many=True)
        serializer.is_valid(raise_exception=True)
        
        for assignment_data in serializer.validated_data:
            assignment = Assignment.objects.create(**assignment_data)
            created_assignments.append(assignment)
        
        output_serializer = AssignmentSerializer(created_assignments, many=True)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Bulk delete assignments',
        description='Delete multiple assignments at once',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'integer'}}}},
        responses={204: OpenApiResponse(description='Assignments deleted successfully')},
        tags=['Assignments']
    )
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'No IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count = Assignment.objects.filter(id__in=ids).delete()[0]
        return Response({'deleted_count': deleted_count}, status=status.HTTP_200_OK)
