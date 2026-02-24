from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.todo.models import TodoList, TodoItem
from apps.todo.serializers import (
    TodoListSerializer,
    TodoListListSerializer,
    TodoListCreateSerializer,
    TodoListUpdateSerializer,
    TodoListMinimalSerializer,
    TodoItemSerializer,
    TodoItemListSerializer,
    TodoItemCreateSerializer,
    TodoItemUpdateSerializer,
    TodoItemMinimalSerializer,
    ConvertToChecklistSerializer,
)
from apps.todo.filters import TodoListFilter, TodoItemFilter
from apps.todo.services import TodoService


@extend_schema_view(
    list=extend_schema(
        summary='List all todo lists',
        description='Retrieve a list of all todo lists for the authenticated user',
        tags=['Todo Lists']
    ),
    retrieve=extend_schema(
        summary='Retrieve a todo list',
        description='Get details of a specific todo list with its items',
        tags=['Todo Lists']
    ),
    create=extend_schema(
        summary='Create a todo list',
        description='Create a new todo list with optional items',
        tags=['Todo Lists']
    ),
    update=extend_schema(
        summary='Update a todo list',
        description='Update an existing todo list',
        tags=['Todo Lists']
    ),
    partial_update=extend_schema(
        summary='Partially update a todo list',
        description='Partially update an existing todo list',
        tags=['Todo Lists']
    ),
    destroy=extend_schema(
        summary='Delete a todo list',
        description='Soft delete a todo list',
        tags=['Todo Lists']
    ),
)
class TodoListViewSet(viewsets.ModelViewSet):
    serializer_class = TodoListSerializer
    filterset_class = TodoListFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at', 'due_date', 'priority']
    ordering = ['-is_favorite', '-created_at']

    def get_queryset(self):
        if self.action == 'restore':
            return TodoList.all_objects.filter(
                user=self.request.user
            ).prefetch_related(
                'items', 'items__children', 'items__children__children',
                'tags'
            ).select_related('folder')
        from django.db.models import Count, Q
        return TodoList.objects.filter(
            user=self.request.user
        ).prefetch_related(
            'items', 'items__children', 'items__children__children',
            'tags'
        ).select_related('folder').annotate(
            _items_count=Count('items'),
            _completed_items_count=Count('items', filter=Q(items__status='completed')),
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return TodoListCreateSerializer
        if self.action in ['update', 'partial_update']:
            return TodoListUpdateSerializer
        if self.action == 'list':
            return TodoListListSerializer
        return TodoListSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()

    @extend_schema(
        summary='Complete a todo list',
        description='Mark a todo list as completed',
        responses={200: TodoListSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        todo_list = self.get_object()
        todo_list.complete()
        serializer = self.get_serializer(todo_list)
        return Response(serializer.data)

    @extend_schema(
        summary='Cancel a todo list',
        description='Mark a todo list as cancelled',
        responses={200: TodoListSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        todo_list = self.get_object()
        todo_list.cancel()
        serializer = self.get_serializer(todo_list)
        return Response(serializer.data)

    @extend_schema(
        summary='Reopen a todo list',
        description='Mark a todo list as active again',
        responses={200: TodoListSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        todo_list = self.get_object()
        todo_list.reopen()
        serializer = self.get_serializer(todo_list)
        return Response(serializer.data)

    @extend_schema(
        summary='Toggle favorite',
        description='Toggle the favorite status of a todo list',
        responses={200: TodoListSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def toggle_favorite(self, request, pk=None):
        todo_list = self.get_object()
        todo_list.is_favorite = not todo_list.is_favorite
        todo_list.save()
        serializer = self.get_serializer(todo_list)
        return Response(serializer.data)

    @extend_schema(
        summary='Convert to checklist item',
        description='Add a new item to the todo list (convert it to a checklist)',
        request=ConvertToChecklistSerializer(),
        responses={201: TodoItemSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def convert_to_checklist(self, request, pk=None):
        todo_list = self.get_object()
        serializer = ConvertToChecklistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = TodoService.convert_to_checklist(
            todo_list=todo_list,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            priority=serializer.validated_data.get('priority', 'medium'),
        )

        output_serializer = TodoItemSerializer(item)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Get todo list statistics',
        description='Get statistics for a specific todo list',
        responses={200: OpenApiResponse(description='Todo list statistics')},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        todo_list = self.get_object()
        stats = TodoService.get_todo_list_stats(todo_list)
        return Response(stats)

    @extend_schema(
        summary='Duplicate a todo list',
        description='Create a copy of a todo list with all its items',
        request={'type': 'object', 'properties': {'name': {'type': 'string'}}},
        responses={201: TodoListSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        todo_list = self.get_object()
        new_name = request.data.get('name')
        new_list = TodoService.duplicate_todo_list(todo_list, new_name)
        serializer = TodoListSerializer(new_list)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Get favorite todo lists',
        description='Get all favorite todo lists',
        responses={200: TodoListMinimalSerializer(many=True)},
        tags=['Todo Lists']
    )
    @action(detail=False, methods=['get'])
    def favorites(self, request):
        favorites = self.get_queryset().filter(is_favorite=True)
        serializer = TodoListMinimalSerializer(favorites, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Restore a deleted todo list',
        description='Restore a soft-deleted todo list',
        responses={200: TodoListSerializer()},
        tags=['Todo Lists']
    )
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        todo_list = self.get_object()
        todo_list.restore()
        serializer = self.get_serializer(todo_list)
        return Response(serializer.data)

    @extend_schema(
        summary='Get overall todo statistics',
        description='Get overall todo statistics for the authenticated user',
        responses={200: OpenApiResponse(description='User todo statistics')},
        tags=['Todo Lists']
    )
    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        stats = TodoService.get_user_todo_stats(request.user)
        return Response(stats)


@extend_schema_view(
    list=extend_schema(
        summary='List all items in a todo list',
        description='Retrieve all items for a specific todo list',
        tags=['Todo Items']
    ),
    retrieve=extend_schema(
        summary='Retrieve a todo item',
        description='Get details of a specific todo item',
        tags=['Todo Items']
    ),
    create=extend_schema(
        summary='Create a todo item',
        description='Create a new item in a todo list',
        tags=['Todo Items']
    ),
    update=extend_schema(
        summary='Update a todo item',
        description='Update an existing todo item',
        tags=['Todo Items']
    ),
    partial_update=extend_schema(
        summary='Partially update a todo item',
        description='Partially update an existing todo item',
        tags=['Todo Items']
    ),
    destroy=extend_schema(
        summary='Delete a todo item',
        description='Delete a todo item',
        tags=['Todo Items']
    ),
)
class TodoItemViewSet(viewsets.ModelViewSet):
    serializer_class = TodoItemSerializer
    filterset_class = TodoItemFilter
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'order', 'created_at', 'updated_at', 'due_date', 'priority']
    ordering = ['order', 'created_at']

    def get_queryset(self):
        todo_list_id = self.kwargs.get('todo_list_pk')
        return TodoItem.objects.filter(
            todo_list__id=todo_list_id,
            todo_list__user=self.request.user
        ).prefetch_related('children')

    def get_serializer_class(self):
        if self.action == 'create':
            return TodoItemCreateSerializer
        if self.action in ['update', 'partial_update']:
            return TodoItemUpdateSerializer
        if self.action == 'list':
            return TodoItemListSerializer
        return TodoItemSerializer

    def perform_create(self, serializer):
        todo_list_id = self.kwargs.get('todo_list_pk')
        try:
            todo_list = TodoList.objects.get(id=todo_list_id, user=self.request.user)
        except TodoList.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Todo list not found')
        serializer.save(todo_list=todo_list)

    @extend_schema(
        summary='Complete a todo item',
        description='Mark a todo item as completed',
        responses={200: TodoItemSerializer()},
        tags=['Todo Items']
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, todo_list_pk=None, pk=None):
        item = self.get_object()
        item.complete()
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @extend_schema(
        summary='Uncomplete a todo item',
        description='Mark a todo item as pending',
        responses={200: TodoItemSerializer()},
        tags=['Todo Items']
    )
    @action(detail=True, methods=['post'])
    def uncomplete(self, request, todo_list_pk=None, pk=None):
        item = self.get_object()
        item.uncomplete()
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @extend_schema(
        summary='Toggle item completion',
        description='Toggle the completion status of a todo item',
        responses={200: TodoItemSerializer()},
        tags=['Todo Items']
    )
    @action(detail=True, methods=['post'])
    def toggle(self, request, todo_list_pk=None, pk=None):
        item = self.get_object()
        if item.is_completed:
            item.uncomplete()
        else:
            item.complete()
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @extend_schema(
        summary='Cancel a todo item',
        description='Mark a todo item as cancelled',
        responses={200: TodoItemSerializer()},
        tags=['Todo Items']
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, todo_list_pk=None, pk=None):
        item = self.get_object()
        item.cancel()
        serializer = self.get_serializer(item)
        return Response(serializer.data)

    @extend_schema(
        summary='Reorder items',
        description='Update the order of multiple items',
        request={'type': 'object', 'properties': {'orders': {'type': 'array', 'items': {'type': 'object', 'properties': {'id': {'type': 'string'}, 'order': {'type': 'integer'}}}}}},
        responses={200: OpenApiResponse(description='Items reordered successfully')},
        tags=['Todo Items']
    )
    @action(detail=False, methods=['post'])
    def reorder(self, request, todo_list_pk=None):
        try:
            todo_list = TodoList.objects.get(id=todo_list_pk, user=request.user)
        except TodoList.DoesNotExist:
            return Response({'error': 'Todo list not found'}, status=status.HTTP_404_NOT_FOUND)
        orders = request.data.get('orders', [])

        if not orders:
            return Response(
                {'error': 'No order data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        TodoService.reorder_items(todo_list, orders)
        return Response({'message': 'Items reordered successfully'})

    @extend_schema(
        summary='Bulk complete items',
        description='Mark multiple items as completed',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'string'}}}},
        responses={200: OpenApiResponse(description='Items completed')},
        tags=['Todo Items']
    )
    @action(detail=False, methods=['post'])
    def bulk_complete(self, request, todo_list_pk=None):
        try:
            todo_list = TodoList.objects.get(id=todo_list_pk, user=request.user)
        except TodoList.DoesNotExist:
            return Response({'error': 'Todo list not found'}, status=status.HTTP_404_NOT_FOUND)
        ids = request.data.get('ids', [])

        if not ids:
            return Response(
                {'error': 'No item IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = TodoService.bulk_complete_items(todo_list, ids)
        return Response({'completed_count': count})

    @extend_schema(
        summary='Bulk uncomplete items',
        description='Mark multiple items as pending',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'string'}}}},
        responses={200: OpenApiResponse(description='Items uncompleted')},
        tags=['Todo Items']
    )
    @action(detail=False, methods=['post'])
    def bulk_uncomplete(self, request, todo_list_pk=None):
        try:
            todo_list = TodoList.objects.get(id=todo_list_pk, user=request.user)
        except TodoList.DoesNotExist:
            return Response({'error': 'Todo list not found'}, status=status.HTTP_404_NOT_FOUND)
        ids = request.data.get('ids', [])

        if not ids:
            return Response(
                {'error': 'No item IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = TodoService.bulk_uncomplete_items(todo_list, ids)
        return Response({'uncompleted_count': count})

    @extend_schema(
        summary='Get item children',
        description='Get all children of a specific item',
        responses={200: TodoItemMinimalSerializer(many=True)},
        tags=['Todo Items']
    )
    @action(detail=True, methods=['get'])
    def children(self, request, todo_list_pk=None, pk=None):
        item = self.get_object()
        children = item.children.all()
        serializer = TodoItemMinimalSerializer(children, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get root items',
        description='Get all root-level items (items without parent)',
        responses={200: TodoItemListSerializer(many=True)},
        tags=['Todo Items']
    )
    @action(detail=False, methods=['get'])
    def roots(self, request, todo_list_pk=None):
        roots = self.get_queryset().filter(parent__isnull=True)
        serializer = TodoItemListSerializer(roots, many=True)
        return Response(serializer.data)
