from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.checklists.models import (
    ChecklistTemplate,
    ChecklistVersion,
    ChecklistItem
)
from apps.checklists.serializers import (
    ChecklistTemplateSerializer,
    ChecklistTemplateListSerializer,
    ChecklistTemplateCreateSerializer,
    ChecklistTemplateUpdateSerializer,
    ChecklistTemplateMinimalSerializer,
    ChecklistVersionSerializer,
    ChecklistVersionListSerializer,
    ChecklistVersionCreateSerializer,
    ChecklistItemSerializer,
    ChecklistItemListSerializer,
    ChecklistItemCreateSerializer,
    ChecklistItemUpdateSerializer,
    ChecklistDuplicateSerializer,
    VersionSetSerializer,
)
from apps.checklists.filters import (
    ChecklistTemplateFilter,
    ChecklistVersionFilter,
    ChecklistItemFilter
)
from apps.checklists.services import ChecklistService
from apps.tags.models import Tag


@extend_schema_view(
    list=extend_schema(
        summary='List all checklist templates',
        description='Retrieve a list of all checklist templates for the authenticated user',
        tags=['Checklists']
    ),
    retrieve=extend_schema(
        summary='Retrieve a checklist template',
        description='Get details of a specific checklist template with current version',
        tags=['Checklists']
    ),
    create=extend_schema(
        summary='Create a checklist template',
        description='Create a new checklist template',
        tags=['Checklists']
    ),
    update=extend_schema(
        summary='Update a checklist template',
        description='Update an existing checklist template',
        tags=['Checklists']
    ),
    partial_update=extend_schema(
        summary='Partially update a checklist template',
        description='Partially update an existing checklist template',
        tags=['Checklists']
    ),
    destroy=extend_schema(
        summary='Delete a checklist template',
        description='Soft delete a checklist template',
        tags=['Checklists']
    ),
)
class ChecklistTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistTemplateSerializer
    filterset_class = ChecklistTemplateFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at', 'is_favorite']
    ordering = ['-is_favorite', '-created_at']

    def get_queryset(self):
        from django.db.models import Count, Q
        return ChecklistTemplate.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('folder', 'current_version').prefetch_related(
            'tags', 'current_version__items',
            'current_version__items__children',
            'current_version__items__children__children',
        ).annotate(
            _versions_count=Count('versions', distinct=True),
            _items_count=Count(
                'current_version__items',
                filter=Q(current_version__items__parent__isnull=True),
                distinct=True,
            ),
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return ChecklistTemplateCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ChecklistTemplateUpdateSerializer
        if self.action == 'list':
            return ChecklistTemplateListSerializer
        return ChecklistTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()

    @extend_schema(
        summary='Get all versions of a checklist',
        description='Get all versions for a specific checklist template',
        responses={200: ChecklistVersionListSerializer(many=True)},
        tags=['Checklists']
    )
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        template = self.get_object()
        versions = template.versions.all()
        serializer = ChecklistVersionListSerializer(versions, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Duplicate a checklist template',
        description='Create a copy of an existing checklist template',
        request=ChecklistDuplicateSerializer,
        responses={201: ChecklistTemplateSerializer()},
        tags=['Checklists']
    )
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        template = self.get_object()
        serializer = ChecklistDuplicateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_name = serializer.validated_data.get('name', f'{template.name} (Copy)')
        new_folder = serializer.validated_data.get('folder_id', template.folder)
        
        new_template = ChecklistService.duplicate_template(
            template=template,
            new_name=new_name,
            new_folder=new_folder
        )
        
        output_serializer = ChecklistTemplateSerializer(new_template)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Toggle favorite status',
        description='Toggle the favorite status of a checklist template',
        responses={200: ChecklistTemplateSerializer()},
        tags=['Checklists']
    )
    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        template = self.get_object()
        template.is_favorite = not template.is_favorite
        template.save()
        serializer = ChecklistTemplateSerializer(template)
        return Response(serializer.data)

    @extend_schema(
        summary='Restore a deleted checklist',
        description='Restore a soft-deleted checklist template',
        responses={200: ChecklistTemplateSerializer()},
        tags=['Checklists']
    )
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        template = self.get_object()
        template.restore()
        serializer = ChecklistTemplateSerializer(template)
        return Response(serializer.data)

    @extend_schema(
        summary='Create a new version',
        description='Create a new version of the checklist template',
        request=ChecklistVersionCreateSerializer,
        responses={201: ChecklistVersionSerializer()},
        tags=['Checklists']
    )
    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        template = self.get_object()
        serializer = ChecklistVersionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        version = ChecklistService.create_version(
            template=template,
            changelog=serializer.validated_data.get('changelog', ''),
            items_data=serializer.validated_data.get('items', [])
        )
        
        output_serializer = ChecklistVersionSerializer(version)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Set active version',
        description='Set a specific version as the active version',
        request=VersionSetSerializer,
        responses={200: ChecklistTemplateSerializer()},
        tags=['Checklists']
    )
    @action(detail=True, methods=['post'])
    def set_active_version(self, request, pk=None):
        template = self.get_object()
        serializer = VersionSetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        version = serializer.validated_data['version_id']
        if version.template != template:
            return Response(
                {'error': 'Version does not belong to this template'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        template.set_active_version(version)
        output_serializer = ChecklistTemplateSerializer(template)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Get favorites',
        description='Get all favorite checklist templates',
        responses={200: ChecklistTemplateMinimalSerializer(many=True)},
        tags=['Checklists']
    )
    @action(detail=False, methods=['get'])
    def favorites(self, request):
        favorites = self.get_queryset().filter(is_favorite=True)
        serializer = ChecklistTemplateMinimalSerializer(favorites, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get deleted checklists',
        description='Get all soft-deleted checklist templates',
        responses={200: ChecklistTemplateListSerializer(many=True)},
        tags=['Checklists']
    )
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        deleted = ChecklistTemplate.all_objects.filter(
            user=request.user,
            is_deleted=True
        ).select_related('folder', 'current_version').prefetch_related('tags')
        serializer = ChecklistTemplateListSerializer(deleted, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get checklist statistics',
        description='Get statistics about checklist templates',
        responses={200: OpenApiResponse(description='Checklist statistics')},
        tags=['Checklists']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        favorites = queryset.filter(is_favorite=True).count()
        with_folder = queryset.filter(folder__isnull=False).count()
        
        return Response({
            'total_checklists': total,
            'favorites': favorites,
            'with_folder': with_folder,
            'without_folder': total - with_folder,
        })

    @extend_schema(
        summary='Bulk delete checklists',
        description='Soft delete multiple checklist templates at once',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'integer'}}}},
        responses={200: OpenApiResponse(description='Checklists deleted')},
        tags=['Checklists']
    )
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'No checklist IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone as tz
        checklists = self.get_queryset().filter(id__in=ids)
        count = checklists.update(is_deleted=True, deleted_at=tz.now())

        return Response({'deleted_count': count})

    @extend_schema(
        summary='Bulk move to folder',
        description='Move multiple checklist templates to a folder',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'integer'}}, 'folder_id': {'type': 'integer', 'nullable': True}}},
        responses={200: OpenApiResponse(description='Checklists moved')},
        tags=['Checklists']
    )
    @action(detail=False, methods=['post'])
    def bulk_move_folder(self, request):
        ids = request.data.get('ids', [])
        folder_id = request.data.get('folder_id')
        if not ids:
            return Response(
                {'error': 'No checklist IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if folder_id is not None:
            from apps.folders.models import Folder
            if not Folder.objects.filter(id=folder_id, user=request.user).exists():
                return Response(
                    {'error': 'Folder not found or does not belong to you'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        count = self.get_queryset().filter(id__in=ids).update(folder_id=folder_id)
        return Response({'updated_count': count})

    @extend_schema(
        summary='Bulk assign tags',
        description='Assign tags to multiple checklist templates',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'integer'}}, 'tag_names': {'type': 'array', 'items': {'type': 'string'}}}},
        responses={200: OpenApiResponse(description='Tags assigned')},
        tags=['Checklists']
    )
    @action(detail=False, methods=['post'])
    def bulk_assign_tags(self, request):
        ids = request.data.get('ids', [])
        tag_names = request.data.get('tag_names', [])
        if not ids or not tag_names:
            return Response(
                {'error': 'Both ids and tag_names are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tags = []
        for name in tag_names:
            tag, _ = Tag.objects.get_or_create(
                name=name.strip(),
                user=request.user,
                defaults={'name': name.strip()}
            )
            tags.append(tag)

        checklists = self.get_queryset().filter(id__in=ids)
        for checklist in checklists:
            checklist.tags.add(*tags)

        return Response({'updated_count': checklists.count(), 'tags_added': len(tags)})


@extend_schema_view(
    list=extend_schema(
        summary='List all versions',
        description='Retrieve a list of all versions for a checklist template',
        tags=['Checklists']
    ),
    retrieve=extend_schema(
        summary='Retrieve a version',
        description='Get details of a specific checklist version',
        tags=['Checklists']
    ),
    create=extend_schema(
        summary='Create a version',
        description='Create a new version for a checklist template',
        tags=['Checklists']
    ),
)
class ChecklistVersionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChecklistVersionSerializer
    filterset_class = ChecklistVersionFilter
    ordering_fields = ['version_number', 'created_at', 'updated_at']
    ordering = ['-version_number']

    def get_queryset(self):
        template_id = self.kwargs.get('template_pk')
        return ChecklistVersion.objects.filter(
            template__user=self.request.user,
            template_id=template_id
        ).prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'list':
            return ChecklistVersionListSerializer
        return ChecklistVersionSerializer

    @extend_schema(
        summary='Set as active version',
        description='Set this version as the active version for the template',
        responses={200: ChecklistVersionSerializer()},
        tags=['Checklists']
    )
    @action(detail=True, methods=['post'])
    def set_active(self, request, template_pk=None, pk=None):
        version = self.get_object()
        version.template.set_active_version(version)
        serializer = ChecklistVersionSerializer(version)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary='List all items',
        description='Retrieve a list of all items for a checklist version',
        tags=['Checklists']
    ),
    retrieve=extend_schema(
        summary='Retrieve an item',
        description='Get details of a specific checklist item',
        tags=['Checklists']
    ),
    create=extend_schema(
        summary='Create an item',
        description='Create a new item for a checklist version',
        tags=['Checklists']
    ),
    update=extend_schema(
        summary='Update an item',
        description='Update an existing checklist item',
        tags=['Checklists']
    ),
    partial_update=extend_schema(
        summary='Partially update an item',
        description='Partially update an existing checklist item',
        tags=['Checklists']
    ),
    destroy=extend_schema(
        summary='Delete an item',
        description='Delete a checklist item',
        tags=['Checklists']
    ),
)
class ChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistItemSerializer
    filterset_class = ChecklistItemFilter
    ordering_fields = ['order', 'priority', 'created_at']
    ordering = ['order']

    def get_queryset(self):
        version_id = self.kwargs.get('version_pk')
        return ChecklistItem.objects.filter(
            version__template__user=self.request.user,
            version_id=version_id
        ).select_related('placeholder')

    def get_serializer_class(self):
        if self.action == 'create':
            return ChecklistItemCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ChecklistItemUpdateSerializer
        if self.action == 'list':
            return ChecklistItemListSerializer
        return ChecklistItemSerializer

    def perform_create(self, serializer):
        version_id = self.kwargs.get('version_pk')
        serializer.save(version_id=version_id)

    @extend_schema(
        summary='Reorder items',
        description='Update the order of multiple items',
        request={'type': 'object', 'properties': {'orders': {'type': 'array', 'items': {'type': 'object', 'properties': {'id': {'type': 'integer'}, 'order': {'type': 'integer'}}}}}},
        responses={200: OpenApiResponse(description='Items reordered successfully')},
        tags=['Checklists']
    )
    @action(detail=False, methods=['post'])
    def reorder(self, request, template_pk=None, version_pk=None):
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

    @extend_schema(
        summary='Get item children',
        description='Get all children of a specific item',
        responses={200: ChecklistItemListSerializer(many=True)},
        tags=['Checklists']
    )
    @action(detail=True, methods=['get'])
    def children(self, request, template_pk=None, version_pk=None, pk=None):
        item = self.get_object()
        children = item.children.all()
        serializer = ChecklistItemListSerializer(children, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get all descendants',
        description='Get all descendants of a specific item recursively',
        responses={200: ChecklistItemListSerializer(many=True)},
        tags=['Checklists']
    )
    @action(detail=True, methods=['get'])
    def descendants(self, request, template_pk=None, version_pk=None, pk=None):
        item = self.get_object()
        descendants = item.get_all_children()
        serializer = ChecklistItemListSerializer(descendants, many=True)
        return Response(serializer.data)
