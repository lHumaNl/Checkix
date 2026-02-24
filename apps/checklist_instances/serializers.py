from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.core.serializers import BaseModelSerializer
from apps.checklist_instances.models import ChecklistInstance, ChecklistItemInstance, CompletionLog


class CompletionLogSerializer(BaseModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = CompletionLog
        fields = [
            'id', 'instance', 'item_instance', 'action', 'user', 'user_username',
            'timestamp', 'duration_seconds', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'timestamp', 'created_at', 'updated_at']


class ChecklistItemInstanceSerializer(BaseModelSerializer):
    class Meta:
        model = ChecklistItemInstance
        fields = [
            'id', 'instance', 'item', 'title', 'description', 'order',
            'is_completed', 'completed_at', 'placeholder_value',
            'parent', 'is_visible', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class ChecklistItemInstanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItemInstance
        fields = ['title', 'description', 'order', 'is_completed', 'placeholder_value', 'is_visible']
        extra_kwargs = {
            'title': {'required': False},
            'description': {'required': False},
            'order': {'required': False},
            'is_completed': {'required': False},
            'placeholder_value': {'required': False},
            'is_visible': {'required': False},
        }


class ChecklistItemInstanceMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItemInstance
        fields = [
            'id', 'title', 'order', 'is_completed', 'completed_at',
            'placeholder_value', 'is_visible'
        ]


class ChecklistItemInstanceNestedSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistItemInstance
        fields = [
            'id', 'item', 'title', 'description', 'order', 'is_completed',
            'completed_at', 'placeholder_value', 'is_visible', 'children'
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = ChecklistItemInstanceNestedSerializer(children, many=True)
        return serializer.data


class ChecklistInstanceSerializer(BaseModelSerializer):
    item_instances = ChecklistItemInstanceNestedSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    version_number = serializers.IntegerField(source='version.version_number', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ChecklistInstance
        fields = [
            'id', 'template', 'template_name', 'version', 'version_number',
            'name', 'user', 'user_username', 'status', 'status_display',
            'started_at', 'completed_at', 'progress_percentage', 'notes',
            'calendar_event', 'item_instances', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'started_at', 'completed_at', 'progress_percentage',
            'created_at', 'updated_at'
        ]


class ChecklistInstanceListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    completed_items_count = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistInstance
        fields = [
            'id', 'template', 'template_name', 'name', 'status', 'status_display',
            'started_at', 'completed_at', 'progress_percentage', 'items_count',
            'completed_items_count', 'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_items_count(self, obj):
        return obj.item_instances.count()

    @extend_schema_field(serializers.IntegerField())
    def get_completed_items_count(self, obj):
        return obj.item_instances.filter(is_completed=True).count()


class ChecklistInstanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistInstance
        fields = ['template', 'version', 'name', 'notes', 'calendar_event']
        extra_kwargs = {
            'template': {'required': False, 'allow_null': True},
            'version': {'required': False, 'allow_null': True},
            'name': {'required': True},
            'notes': {'required': False, 'allow_blank': True},
            'calendar_event': {'required': False, 'allow_null': True},
        }

    def to_representation(self, instance):
        return ChecklistInstanceSerializer(instance, context=self.context).data


class ChecklistInstanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistInstance
        fields = ['name', 'notes', 'calendar_event']
        extra_kwargs = {
            'name': {'required': False},
            'notes': {'required': False, 'allow_blank': True},
            'calendar_event': {'required': False, 'allow_null': True},
        }


class ChecklistInstanceMinimalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ChecklistInstance
        fields = ['id', 'name', 'status', 'status_display', 'progress_percentage']


class ApplyToTemplateSerializer(serializers.Serializer):
    create_new_version = serializers.BooleanField(default=True)
    version_notes = serializers.CharField(required=False, allow_blank=True)
