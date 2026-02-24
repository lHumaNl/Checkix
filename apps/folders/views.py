from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.folders.models import Folder
from apps.folders.serializers import (
    FolderSerializer,
    FolderListSerializer,
    FolderCreateSerializer,
    FolderUpdateSerializer,
    FolderTreeSerializer,
    FolderWithPathSerializer,
    FolderMinimalSerializer
)
from apps.folders.filters import FolderFilter, FolderTreeFilter


@extend_schema_view(
    list=extend_schema(
        summary='List all folders',
        description='Retrieve a list of all folders for the authenticated user',
        tags=['Folders']
    ),
    retrieve=extend_schema(
        summary='Retrieve a folder',
        description='Get details of a specific folder with nested children',
        tags=['Folders']
    ),
    create=extend_schema(
        summary='Create a folder',
        description='Create a new folder',
        tags=['Folders']
    ),
    update=extend_schema(
        summary='Update a folder',
        description='Update an existing folder',
        tags=['Folders']
    ),
    partial_update=extend_schema(
        summary='Partially update a folder',
        description='Partially update an existing folder',
        tags=['Folders']
    ),
    destroy=extend_schema(
        summary='Delete a folder',
        description='Delete a folder. Child folders will also be deleted.',
        tags=['Folders']
    ),
)
class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    filterset_class = FolderFilter
    search_fields = ['name', 'icon']
    ordering_fields = ['name', 'order', 'created_at', 'updated_at']
    ordering = ['order', 'name']

    def get_queryset(self):
        return Folder.objects.filter(user=self.request.user).prefetch_related(
            'children', 'children__children', 'children__children__children'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return FolderCreateSerializer
        if self.action in ['update', 'partial_update']:
            return FolderUpdateSerializer
        if self.action == 'list':
            return FolderListSerializer
        if self.action == 'tree':
            return FolderTreeSerializer
        if self.action == 'with_path':
            return FolderWithPathSerializer
        return FolderSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary='Get folder tree',
        description='Get the complete folder tree structure',
        responses={200: FolderTreeSerializer(many=True)},
        tags=['Folders']
    )
    @action(detail=False, methods=['get'])
    def tree(self, request):
        root_folders = self.get_queryset().filter(parent__isnull=True)
        serializer = self.get_serializer(root_folders, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get folder with full path',
        description='Get all folders with their full path from root',
        responses={200: FolderWithPathSerializer(many=True)},
        tags=['Folders']
    )
    @action(detail=False, methods=['get'])
    def with_path(self, request):
        folders = self.get_queryset()
        serializer = self.get_serializer(folders, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get root folders',
        description='Get all root-level folders (folders without parent)',
        responses={200: FolderMinimalSerializer(many=True)},
        tags=['Folders']
    )
    @action(detail=False, methods=['get'])
    def roots(self, request):
        root_folders = self.get_queryset().filter(parent__isnull=True)
        serializer = FolderMinimalSerializer(root_folders, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get folder children',
        description='Get direct children of a specific folder',
        responses={200: FolderMinimalSerializer(many=True)},
        tags=['Folders']
    )
    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        folder = self.get_object()
        children = folder.children.all()
        serializer = FolderMinimalSerializer(children, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get folder ancestors',
        description='Get all ancestors of a specific folder',
        responses={200: FolderMinimalSerializer(many=True)},
        tags=['Folders']
    )
    @action(detail=True, methods=['get'])
    def ancestors(self, request, pk=None):
        folder = self.get_object()
        ancestors = folder.get_ancestors()
        serializer = FolderMinimalSerializer(reversed(ancestors), many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get folder descendants',
        description='Get all descendants of a specific folder',
        responses={200: FolderMinimalSerializer(many=True)},
        tags=['Folders']
    )
    @action(detail=True, methods=['get'])
    def descendants(self, request, pk=None):
        folder = self.get_object()
        descendants = folder.get_descendants()
        serializer = FolderMinimalSerializer(descendants, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Move folder',
        description='Move a folder to a new parent or make it a root folder',
        request={'type': 'object', 'properties': {'parent_id': {'type': 'string', 'nullable': True}}},
        responses={200: FolderSerializer()},
        tags=['Folders']
    )
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        folder = self.get_object()
        parent_id = request.data.get('parent_id')

        if parent_id:
            try:
                new_parent = self.get_queryset().get(id=parent_id)
                if new_parent == folder or new_parent.id in [d.id for d in folder.get_descendants()]:
                    return Response(
                        {'error': 'Cannot move folder to itself or its descendants'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                folder.parent = new_parent
            except Folder.DoesNotExist:
                return Response(
                    {'error': 'Parent folder not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            folder.parent = None

        folder.save()
        serializer = FolderSerializer(folder)
        return Response(serializer.data)

    @extend_schema(
        summary='Reorder folders',
        description='Update the order of folders',
        request={'type': 'object', 'properties': {'orders': {'type': 'array', 'items': {'type': 'object', 'properties': {'id': {'type': 'string'}, 'order': {'type': 'integer'}}}}}},
        responses={200: OpenApiResponse(description='Folders reordered successfully')},
        tags=['Folders']
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
            folder_id = item.get('id')
            order = item.get('order')
            if folder_id and order is not None:
                self.get_queryset().filter(id=folder_id).update(order=order)

        return Response({'message': 'Folders reordered successfully'})

    @extend_schema(
        summary='Get folder statistics',
        description='Get statistics about folders',
        responses={200: OpenApiResponse(description='Folder statistics')},
        tags=['Folders']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total_folders = queryset.count()
        root_folders = queryset.filter(parent__isnull=True).count()

        # Compute max_depth via iterative parent chain traversal
        # using only IDs to avoid loading full objects
        parent_map = dict(queryset.values_list('id', 'parent_id'))
        max_depth = 0
        for folder_id, parent_id in parent_map.items():
            depth = 0
            pid = parent_id
            while pid is not None:
                depth += 1
                pid = parent_map.get(pid)
            if depth > max_depth:
                max_depth = depth

        return Response({
            'total_folders': total_folders,
            'root_folders': root_folders,
            'max_depth': max_depth,
        })
