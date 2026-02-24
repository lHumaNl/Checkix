from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.audit.models import AuditLog


class AuditLogSerializer(BaseModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'action_display',
            'entity_type', 'entity_type_display', 'entity_id', 'entity_name',
            'checklist_instance', 'changes', 'ip_address', 'user_agent',
            'additional_data', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class AuditLogListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_email', 'action', 'action_display',
            'entity_type', 'entity_type_display', 'entity_id', 'entity_name',
            'created_at'
        ]


class AuditLogMinimalSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'action_display', 'entity_type', 'entity_id', 'created_at']


class AuditLogCreateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=AuditLog.ACTION_CHOICES)
    entity_type = serializers.ChoiceField(choices=AuditLog.ENTITY_CHOICES)
    entity_id = serializers.IntegerField()
    entity_name = serializers.CharField(max_length=200, required=False, default='')
    changes = serializers.DictField(required=False, default=dict)
    additional_data = serializers.DictField(required=False, default=dict)


class AuditSummarySerializer(serializers.Serializer):
    total_logs = serializers.IntegerField()
    action_counts = serializers.DictField()
    entity_type_counts = serializers.DictField()
    recent_actions = serializers.ListField()
