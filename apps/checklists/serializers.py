from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.core.serializers import BaseModelSerializer
from apps.folders.models import Folder
from apps.checklists.models import (
    ChecklistTemplate,
    ChecklistVersion,
    Placeholder,
    PlaceholderOption,
    ChecklistItem
)
from apps.tags.models import Tag


class PlaceholderOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceholderOption
        fields = ['id', 'value', 'display_text', 'order']


class PlaceholderOptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceholderOption
        fields = ['value', 'display_text', 'order']


class PlaceholderSerializer(BaseModelSerializer):
    options = PlaceholderOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Placeholder
        fields = [
            'id', 'name', 'placeholder_type', 'is_required',
            'default_value', 'options', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PlaceholderCreateSerializer(serializers.ModelSerializer):
    options = PlaceholderOptionCreateSerializer(many=True, required=False)

    class Meta:
        model = Placeholder
        fields = ['name', 'placeholder_type', 'is_required', 'default_value', 'options']

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        placeholder = Placeholder.objects.create(**validated_data)
        for option_data in options_data:
            PlaceholderOption.objects.create(placeholder=placeholder, **option_data)
        return placeholder


class ChecklistItemSerializer(BaseModelSerializer):
    children = serializers.SerializerMethodField()
    depth = serializers.ReadOnlyField()
    placeholder = PlaceholderSerializer(read_only=True)
    placeholder_id = serializers.PrimaryKeyRelatedField(
        queryset=Placeholder.objects.all(),
        source='placeholder',
        required=False,
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = ChecklistItem
        fields = [
            'id', 'version', 'parent', 'title', 'description', 'order',
            'is_required', 'priority', 'placeholder', 'placeholder_id',
            'is_halt', 'halt_message', 'children', 'depth',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'depth']

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = ChecklistItemSerializer(children, many=True)
        return serializer.data


class ChecklistItemListSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    has_children = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistItem
        fields = [
            'id', 'parent', 'title', 'order', 'is_required',
            'priority', 'is_halt', 'has_children', 'children'
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = ChecklistItemListSerializer(children, many=True)
        return serializer.data

    @extend_schema_field(serializers.BooleanField())
    def get_has_children(self, obj):
        return obj.children.exists()


class ChecklistItemCreateSerializer(serializers.ModelSerializer):
    children = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = ChecklistItem
        fields = [
            'parent', 'title', 'description', 'order', 'is_required',
            'priority', 'placeholder', 'is_halt', 'halt_message', 'children'
        ]
        extra_kwargs = {
            'parent': {'required': False, 'allow_null': True},
            'description': {'required': False, 'allow_blank': True},
            'placeholder': {'required': False, 'allow_null': True},
        }


class ChecklistItemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = [
            'parent', 'title', 'description', 'order', 'is_required',
            'priority', 'placeholder', 'is_halt', 'halt_message'
        ]
        extra_kwargs = {
            'parent': {'required': False, 'allow_null': True},
            'title': {'required': False},
            'description': {'required': False, 'allow_blank': True},
            'order': {'required': False},
            'is_required': {'required': False},
            'priority': {'required': False},
            'placeholder': {'required': False, 'allow_null': True},
            'is_halt': {'required': False},
            'halt_message': {'required': False, 'allow_blank': True},
        }


class ChecklistVersionSerializer(BaseModelSerializer):
    items = serializers.SerializerMethodField()
    items_count = serializers.ReadOnlyField()

    class Meta:
        model = ChecklistVersion
        fields = [
            'id', 'template', 'version_number', 'changelog', 'is_active',
            'items', 'items_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'version_number', 'created_at', 'updated_at']

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_items(self, obj):
        items = obj.items.filter(parent__isnull=True)
        serializer = ChecklistItemSerializer(items, many=True)
        return serializer.data


class ChecklistVersionListSerializer(serializers.ModelSerializer):
    items_count = serializers.ReadOnlyField()

    class Meta:
        model = ChecklistVersion
        fields = ['id', 'version_number', 'changelog', 'is_active', 'items_count', 'created_at']


class ChecklistVersionCreateSerializer(serializers.ModelSerializer):
    items = ChecklistItemCreateSerializer(many=True, required=False)

    class Meta:
        model = ChecklistVersion
        fields = ['changelog', 'items']


class ChecklistTemplateSerializer(BaseModelSerializer):
    title = serializers.CharField(source='name', read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(read_only=True)
    folder_id = serializers.PrimaryKeyRelatedField(
        read_only=True,
        allow_null=True
    )
    current_version = ChecklistVersionSerializer(read_only=True)
    versions_count = serializers.ReadOnlyField()
    items_count = serializers.ReadOnlyField()
    tags = serializers.SerializerMethodField()
    tag_details = serializers.SerializerMethodField()
    execution_mode = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'title', 'description', 'user_id', 'folder_id',
            'tags', 'tag_details', 'current_version', 'execution_mode',
            'icon', 'is_favorite', 'is_deleted', 'deleted_at',
            'status', 'category', 'estimated_duration', 'versions_count', 'items_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id', 'is_deleted', 'deleted_at']

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all()]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_tag_details(self, obj):
        from apps.tags.serializers import TagMinimalSerializer
        serializer = TagMinimalSerializer(obj.tags.all(), many=True)
        return serializer.data

    @extend_schema_field(serializers.ChoiceField(choices=['sequential', 'free_order']))
    def get_execution_mode(self, obj):
        return 'sequential' if obj.sequential_mode else 'free_order'


class ChecklistTemplateListSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name', read_only=True)
    current_version_number = serializers.SerializerMethodField()
    versions_count = serializers.ReadOnlyField()
    items_count = serializers.ReadOnlyField()
    folder_name = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    execution_mode = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            'id', 'title', 'description', 'folder', 'folder_name',
            'icon', 'is_favorite', 'status', 'category', 'execution_mode',
            'current_version_number', 'versions_count', 'items_count',
            'tags', 'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_current_version_number(self, obj):
        if obj.current_version:
            return obj.current_version.version_number
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_folder_name(self, obj):
        if obj.folder:
            return obj.folder.name
        return None

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all()]

    @extend_schema_field(serializers.ChoiceField(choices=['sequential', 'free_order']))
    def get_execution_mode(self, obj):
        return 'sequential' if obj.sequential_mode else 'free_order'


class ChecklistTemplateCreateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name')
    folder_id = serializers.PrimaryKeyRelatedField(
        source='folder',
        queryset=Folder.objects.all(),
        required=False,
        allow_null=True
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list
    )
    execution_mode = serializers.ChoiceField(
        choices=['sequential', 'free_order'],
        required=False,
        default='free_order'
    )
    items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )

    class Meta:
        model = ChecklistTemplate
        fields = [
            'title', 'description', 'folder_id', 'tags', 'execution_mode',
            'icon', 'is_favorite', 'estimated_duration', 'status', 'category',
            'items'
        ]
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'icon': {'required': False, 'allow_blank': True},
            'estimated_duration': {'required': False, 'allow_null': True},
            'status': {'required': False},
            'category': {'required': False, 'allow_blank': True},
        }

    def to_representation(self, instance):
        return ChecklistTemplateSerializer(instance, context=self.context).data

    @transaction.atomic
    def create(self, validated_data):
        from apps.checklists.services import ChecklistService

        tag_names = validated_data.pop('tags', [])
        items_data = validated_data.pop('items', [])
        execution_mode = validated_data.pop('execution_mode', 'free_order')
        validated_data['sequential_mode'] = (execution_mode == 'sequential')

        template = ChecklistTemplate.objects.create(**validated_data)

        # Find or create tags for the user
        if tag_names:
            user = template.user
            tags = []
            for tag_name in tag_names:
                tag, _ = Tag.objects.get_or_create(
                    name=tag_name.strip(),
                    user=user,
                    defaults={'color': '#6366f1', 'description': ''}
                )
                tags.append(tag)
            template.tags.set(tags)

        # Map frontend 'content' field to backend 'title' and strip unknown fields
        mapped_items = []
        allowed_item_fields = {'title', 'description', 'order', 'is_required', 'priority', 'is_halt', 'halt_message'}
        for idx, item_data in enumerate(items_data):
            mapped = {}
            # Map 'content' → 'title'
            mapped['title'] = item_data.get('title') or item_data.get('content', '')
            mapped['description'] = item_data.get('description', '') or ''
            mapped['order'] = item_data.get('order', idx)
            mapped['is_required'] = item_data.get('is_required', True)
            mapped['priority'] = item_data.get('priority', 'medium')
            mapped['is_halt'] = item_data.get('is_halt', False)
            mapped['halt_message'] = item_data.get('halt_message', '') or ''
            if mapped['title']:
                mapped_items.append(mapped)

        # Create initial version with items (handles current_version assignment)
        ChecklistService.create_initial_version(template, mapped_items or None)

        return template


class ChecklistTemplateUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name', required=False)
    folder_id = serializers.PrimaryKeyRelatedField(
        source='folder',
        queryset=Folder.objects.all(),
        required=False,
        allow_null=True
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    execution_mode = serializers.ChoiceField(
        choices=['sequential', 'free_order'],
        required=False
    )

    class Meta:
        model = ChecklistTemplate
        fields = [
            'title', 'description', 'folder_id', 'tags', 'execution_mode',
            'icon', 'is_favorite', 'estimated_duration', 'status', 'category'
        ]
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'icon': {'required': False, 'allow_blank': True},
            'estimated_duration': {'required': False, 'allow_null': True},
            'status': {'required': False},
            'category': {'required': False, 'allow_blank': True},
        }

    def to_representation(self, instance):
        return ChecklistTemplateSerializer(instance, context=self.context).data

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tags', None)
        execution_mode = validated_data.pop('execution_mode', None)

        if execution_mode is not None:
            validated_data['sequential_mode'] = (execution_mode == 'sequential')

        instance = super().update(instance, validated_data)

        if tag_names is not None:
            user = instance.user
            tags = []
            for tag_name in tag_names:
                tag, _ = Tag.objects.get_or_create(
                    name=tag_name.strip(),
                    user=user,
                    defaults={'color': '#6366f1', 'description': ''}
                )
                tags.append(tag)
            instance.tags.set(tags)

        return instance


class ChecklistTemplateMinimalSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='name', read_only=True)
    current_version_number = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = ['id', 'title', 'icon', 'is_favorite', 'current_version_number']

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_current_version_number(self, obj):
        if obj.current_version:
            return obj.current_version.version_number
        return None


class ChecklistDuplicateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    folder_id = serializers.IntegerField(required=False, allow_null=True)


class VersionSetSerializer(serializers.Serializer):
    version_id = serializers.PrimaryKeyRelatedField(
        queryset=ChecklistVersion.objects.all()
    )
