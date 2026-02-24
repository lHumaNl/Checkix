from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.notifications.models import (
    DynamicDueDateRule,
    NotificationRule,
    NotificationSequence,
    NotificationLog
)


class NotificationSequenceSerializer(BaseModelSerializer):
    recipient_group_name = serializers.SerializerMethodField()

    class Meta:
        model = NotificationSequence
        fields = [
            'id', 'notification_rule', 'sequence_order', 'trigger_offset_minutes',
            'recipient_type', 'recipient_group', 'recipient_group_name',
            'custom_email', 'email_subject', 'email_body',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_recipient_group_name(self, obj):
        if obj.recipient_group:
            return obj.recipient_group.name
        return None


class NotificationSequenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSequence
        fields = [
            'sequence_order', 'trigger_offset_minutes', 'recipient_type',
            'recipient_group', 'custom_email', 'email_subject', 'email_body'
        ]
        extra_kwargs = {
            'recipient_group': {'required': False, 'allow_null': True},
            'custom_email': {'required': False, 'allow_blank': True},
            'email_subject': {'required': False, 'allow_blank': True},
            'email_body': {'required': False, 'allow_blank': True},
        }

    def validate(self, data):
        recipient_type = data.get('recipient_type')
        if recipient_type == 'group' and not data.get('recipient_group'):
            raise serializers.ValidationError(
                {'recipient_group': 'This field is required when recipient_type is "group".'}
            )
        if recipient_type == 'custom' and not data.get('custom_email'):
            raise serializers.ValidationError(
                {'custom_email': 'This field is required when recipient_type is "custom".'}
            )
        return data


class NotificationSequenceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSequence
        fields = [
            'sequence_order', 'trigger_offset_minutes', 'recipient_type',
            'recipient_group', 'custom_email', 'email_subject', 'email_body'
        ]
        extra_kwargs = {
            'sequence_order': {'required': False},
            'trigger_offset_minutes': {'required': False},
            'recipient_type': {'required': False},
            'recipient_group': {'required': False, 'allow_null': True},
            'custom_email': {'required': False, 'allow_blank': True},
            'email_subject': {'required': False, 'allow_blank': True},
            'email_body': {'required': False, 'allow_blank': True},
        }


class NotificationRuleSerializer(BaseModelSerializer):
    sequences = NotificationSequenceSerializer(many=True, read_only=True)
    checklist_template_name = serializers.SerializerMethodField()
    checklist_item_title = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = NotificationRule
        fields = [
            'id', 'checklist_template', 'checklist_template_name',
            'checklist_item', 'checklist_item_title',
            'assignment', 'event_type', 'event_type_display',
            'is_active', 'sequences', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_checklist_template_name(self, obj):
        if obj.checklist_template:
            return obj.checklist_template.name
        return None

    def get_checklist_item_title(self, obj):
        if obj.checklist_item:
            return obj.checklist_item.title
        return None


class NotificationRuleListSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    sequences_count = serializers.SerializerMethodField()
    checklist_template_name = serializers.SerializerMethodField()

    class Meta:
        model = NotificationRule
        fields = [
            'id', 'checklist_template', 'checklist_template_name',
            'event_type', 'event_type_display', 'is_active',
            'sequences_count', 'created_at'
        ]

    def get_sequences_count(self, obj):
        return obj.sequences.count()

    def get_checklist_template_name(self, obj):
        if obj.checklist_template:
            return obj.checklist_template.name
        return None


class NotificationRuleCreateSerializer(serializers.ModelSerializer):
    sequences = NotificationSequenceCreateSerializer(many=True, required=False)

    class Meta:
        model = NotificationRule
        fields = [
            'checklist_template', 'checklist_item', 'assignment',
            'event_type', 'is_active', 'sequences'
        ]
        extra_kwargs = {
            'checklist_template': {'required': False, 'allow_null': True},
            'checklist_item': {'required': False, 'allow_null': True},
            'assignment': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        sequences_data = validated_data.pop('sequences', [])
        notification_rule = NotificationRule.objects.create(**validated_data)
        for sequence_data in sequences_data:
            NotificationSequence.objects.create(
                notification_rule=notification_rule,
                **sequence_data
            )
        return notification_rule


class NotificationRuleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRule
        fields = [
            'checklist_template', 'checklist_item', 'assignment',
            'event_type', 'is_active'
        ]
        extra_kwargs = {
            'checklist_template': {'required': False, 'allow_null': True},
            'checklist_item': {'required': False, 'allow_null': True},
            'assignment': {'required': False, 'allow_null': True},
            'event_type': {'required': False},
            'is_active': {'required': False},
        }


class DynamicDueDateRuleSerializer(BaseModelSerializer):
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    checklist_template_name = serializers.SerializerMethodField()
    checklist_item_title = serializers.SerializerMethodField()

    class Meta:
        model = DynamicDueDateRule
        fields = [
            'id', 'checklist_template', 'checklist_template_name',
            'checklist_item', 'checklist_item_title',
            'trigger_type', 'trigger_type_display', 'trigger_item_id',
            'trigger_parameter_name', 'offset_minutes', 'business_days_only',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_checklist_template_name(self, obj):
        if obj.checklist_template:
            return obj.checklist_template.name
        return None

    def get_checklist_item_title(self, obj):
        if obj.checklist_item:
            return obj.checklist_item.title
        return None


class DynamicDueDateRuleListSerializer(serializers.ModelSerializer):
    trigger_type_display = serializers.CharField(source='get_trigger_type_display', read_only=True)
    checklist_template_name = serializers.SerializerMethodField()

    class Meta:
        model = DynamicDueDateRule
        fields = [
            'id', 'checklist_template', 'checklist_template_name',
            'trigger_type', 'trigger_type_display', 'offset_minutes',
            'business_days_only', 'created_at'
        ]

    def get_checklist_template_name(self, obj):
        if obj.checklist_template:
            return obj.checklist_template.name
        return None


class DynamicDueDateRuleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicDueDateRule
        fields = [
            'checklist_template', 'checklist_item', 'trigger_type',
            'trigger_item_id', 'trigger_parameter_name', 'offset_minutes',
            'business_days_only'
        ]
        extra_kwargs = {
            'checklist_template': {'required': False, 'allow_null': True},
            'checklist_item': {'required': False, 'allow_null': True},
            'trigger_item_id': {'required': False, 'allow_null': True},
            'trigger_parameter_name': {'required': False, 'allow_blank': True},
        }


class DynamicDueDateRuleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicDueDateRule
        fields = [
            'checklist_template', 'checklist_item', 'trigger_type',
            'trigger_item_id', 'trigger_parameter_name', 'offset_minutes',
            'business_days_only'
        ]
        extra_kwargs = {
            'checklist_template': {'required': False, 'allow_null': True},
            'checklist_item': {'required': False, 'allow_null': True},
            'trigger_type': {'required': False},
            'trigger_item_id': {'required': False, 'allow_null': True},
            'trigger_parameter_name': {'required': False, 'allow_blank': True},
            'offset_minutes': {'required': False},
            'business_days_only': {'required': False},
        }


class NotificationLogSerializer(BaseModelSerializer):
    notification_rule_id = serializers.SerializerMethodField()
    sequence_order = serializers.SerializerMethodField()
    checklist_instance_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = NotificationLog
        fields = [
            'id', 'notification_sequence', 'notification_rule_id', 'sequence_order',
            'checklist_instance', 'checklist_instance_name',
            'recipient_email', 'status', 'status_display',
            'sent_at', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_notification_rule_id(self, obj):
        if obj.notification_sequence and obj.notification_sequence.notification_rule:
            return obj.notification_sequence.notification_rule.id
        return None

    def get_sequence_order(self, obj):
        if obj.notification_sequence:
            return obj.notification_sequence.sequence_order
        return None

    def get_checklist_instance_name(self, obj):
        if obj.checklist_instance:
            return obj.checklist_instance.name
        return None


class NotificationLogListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    checklist_instance_name = serializers.SerializerMethodField()

    class Meta:
        model = NotificationLog
        fields = [
            'id', 'checklist_instance', 'checklist_instance_name',
            'recipient_email', 'status', 'status_display',
            'sent_at', 'created_at'
        ]

    def get_checklist_instance_name(self, obj):
        if obj.checklist_instance:
            return obj.checklist_instance.name
        return None
