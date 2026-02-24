from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.run_links.models import RunLink


class RunLinkSerializer(BaseModelSerializer):
    checklist_template_id = serializers.PrimaryKeyRelatedField(read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    access_type_display = serializers.CharField(source='get_access_type_display', read_only=True)
    is_expired = serializers.ReadOnlyField()
    is_max_uses_reached = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = RunLink
        fields = [
            'id', 'checklist_template', 'checklist_template_id', 'unique_id',
            'name', 'access_type', 'access_type_display', 'preset_values',
            'expires_at', 'max_uses', 'usage_count', 'created_by', 'created_by_email',
            'is_expired', 'is_max_uses_reached', 'is_valid', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'unique_id', 'usage_count', 'created_at', 'updated_at']


class RunLinkListSerializer(serializers.ModelSerializer):
    access_type_display = serializers.CharField(source='get_access_type_display', read_only=True)
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = RunLink
        fields = [
            'id', 'unique_id', 'name', 'access_type', 'access_type_display',
            'expires_at', 'max_uses', 'usage_count', 'is_valid', 'created_at'
        ]


class RunLinkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunLink
        fields = [
            'checklist_template', 'name', 'access_type', 'preset_values',
            'expires_at', 'max_uses'
        ]
        extra_kwargs = {
            'name': {'required': True},
            'access_type': {'required': False, 'default': 'public'},
            'preset_values': {'required': False, 'default': dict},
            'expires_at': {'required': False, 'allow_null': True},
            'max_uses': {'required': False, 'allow_null': True},
        }


class RunLinkUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunLink
        fields = ['name', 'access_type', 'preset_values', 'expires_at', 'max_uses']
        extra_kwargs = {
            'name': {'required': False},
            'access_type': {'required': False},
            'preset_values': {'required': False},
            'expires_at': {'required': False, 'allow_null': True},
            'max_uses': {'required': False, 'allow_null': True},
        }


class RunLinkMinimalSerializer(serializers.ModelSerializer):
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = RunLink
        fields = ['id', 'unique_id', 'name', 'is_valid']


class RunLinkExecuteSerializer(serializers.Serializer):
    unique_id = serializers.UUIDField()
    preset_overrides = serializers.DictField(required=False, default=dict)
