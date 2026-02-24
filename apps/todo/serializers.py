from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.core.serializers import BaseModelSerializer
from apps.todo.models import TodoList, TodoItem


class TagMinimalSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    color = serializers.CharField(read_only=True)


class FolderMinimalSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    icon = serializers.CharField(read_only=True)


class TodoItemSerializer(BaseModelSerializer):
    todo_list_id = serializers.PrimaryKeyRelatedField(read_only=True)
    parent_id = serializers.PrimaryKeyRelatedField(read_only=True)
    is_completed = serializers.ReadOnlyField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = TodoItem
        fields = [
            'id', 'todo_list_id', 'title', 'description', 'status', 'order',
            'due_date', 'completed_at', 'priority', 'parent_id', 'is_completed',
            'children', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'todo_list_id', 'completed_at']

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = TodoItemListSerializer(children, many=True)
        return serializer.data


class TodoItemListSerializer(serializers.ModelSerializer):
    is_completed = serializers.ReadOnlyField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = TodoItem
        fields = [
            'id', 'title', 'status', 'order', 'due_date', 'priority',
            'parent_id', 'is_completed', 'children'
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = TodoItemListSerializer(children, many=True)
        return serializer.data


class TodoItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoItem
        fields = ['title', 'description', 'status', 'order', 'due_date', 'priority', 'parent']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'status': {'required': False},
            'order': {'required': False},
            'due_date': {'required': False, 'allow_null': True},
            'priority': {'required': False},
            'parent': {'required': False, 'allow_null': True},
        }


class TodoItemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TodoItem
        fields = ['title', 'description', 'status', 'order', 'due_date', 'priority', 'parent']
        extra_kwargs = {
            'title': {'required': False},
            'description': {'required': False, 'allow_blank': True},
            'status': {'required': False},
            'order': {'required': False},
            'due_date': {'required': False, 'allow_null': True},
            'priority': {'required': False},
            'parent': {'required': False, 'allow_null': True},
        }


class TodoItemMinimalSerializer(serializers.ModelSerializer):
    is_completed = serializers.ReadOnlyField()

    class Meta:
        model = TodoItem
        fields = ['id', 'title', 'status', 'order', 'is_completed']


class TodoListSerializer(BaseModelSerializer, serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(read_only=True)
    folder_id = serializers.PrimaryKeyRelatedField(read_only=True)
    items_count = serializers.ReadOnlyField()
    completed_items_count = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    items = serializers.SerializerMethodField()
    tags = TagMinimalSerializer(many=True, read_only=True)
    folder = FolderMinimalSerializer(read_only=True)

    class Meta:
        model = TodoList
        fields = [
            'id', 'name', 'description', 'user_id', 'folder_id', 'folder',
            'tags', 'status', 'due_date', 'completed_at', 'priority',
            'icon', 'is_favorite', 'items_count', 'completed_items_count',
            'progress_percentage', 'items', 'is_deleted', 'deleted_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'user_id', 'completed_at',
            'is_deleted', 'deleted_at', 'items_count', 'completed_items_count',
            'progress_percentage'
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_items(self, obj):
        items = obj.items.filter(parent__isnull=True)
        serializer = TodoItemListSerializer(items, many=True)
        return serializer.data


class TodoListListSerializer(serializers.ModelSerializer):
    items_count = serializers.ReadOnlyField()
    completed_items_count = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    tags = TagMinimalSerializer(many=True, read_only=True)
    folder = FolderMinimalSerializer(read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = TodoList
        fields = [
            'id', 'name', 'status', 'due_date', 'priority', 'icon',
            'is_favorite', 'items_count', 'completed_items_count',
            'progress_percentage', 'tags', 'folder', 'items', 'created_at'
        ]

    def get_items(self, obj):
        items = obj.items.filter(parent__isnull=True)
        serializer = TodoItemListSerializer(items, many=True)
        return serializer.data


class TodoListCreateSerializer(serializers.ModelSerializer):
    items = TodoItemCreateSerializer(many=True, required=False)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = TodoList
        fields = [
            'name', 'description', 'folder', 'tag_ids', 'status',
            'due_date', 'priority', 'icon', 'is_favorite', 'items'
        ]
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'folder': {'required': False, 'allow_null': True},
            'status': {'required': False},
            'due_date': {'required': False, 'allow_null': True},
            'priority': {'required': False},
            'icon': {'required': False, 'allow_blank': True},
            'is_favorite': {'required': False},
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        tag_ids = validated_data.pop('tag_ids', [])

        todo_list = TodoList.objects.create(**validated_data)

        if tag_ids:
            from apps.tags.models import Tag
            tags = Tag.objects.filter(id__in=tag_ids, user=validated_data['user'])
            todo_list.tags.set(tags)

        for idx, item_data in enumerate(items_data):
            TodoItem.objects.create(
                todo_list=todo_list,
                order=item_data.get('order', idx),
                **{k: v for k, v in item_data.items() if k != 'order'}
            )

        return todo_list


class TodoListUpdateSerializer(serializers.ModelSerializer):
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = TodoList
        fields = [
            'name', 'description', 'folder', 'tag_ids', 'status',
            'due_date', 'priority', 'icon', 'is_favorite'
        ]
        extra_kwargs = {
            'name': {'required': False},
            'description': {'required': False, 'allow_blank': True},
            'folder': {'required': False, 'allow_null': True},
            'status': {'required': False},
            'due_date': {'required': False, 'allow_null': True},
            'priority': {'required': False},
            'icon': {'required': False, 'allow_blank': True},
            'is_favorite': {'required': False},
        }

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tag_ids is not None:
            from apps.tags.models import Tag
            tags = Tag.objects.filter(id__in=tag_ids, user=instance.user)
            instance.tags.set(tags)

        return instance


class TodoListMinimalSerializer(serializers.ModelSerializer):
    items_count = serializers.ReadOnlyField()

    class Meta:
        model = TodoList
        fields = ['id', 'name', 'status', 'priority', 'icon', 'is_favorite', 'items_count']


class ConvertToChecklistSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high'],
        required=False,
        default='medium'
    )
