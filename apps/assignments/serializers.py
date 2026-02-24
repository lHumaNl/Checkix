from django.contrib.auth.models import User
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.assignments.models import Assignment


class AssignmentSerializer(BaseModelSerializer):
    assignee_display = serializers.ReadOnlyField()
    target_display = serializers.ReadOnlyField()
    assignee_user_name = serializers.SerializerMethodField()
    assignee_group_name = serializers.SerializerMethodField()
    checklist_template_name = serializers.SerializerMethodField()
    checklist_item_title = serializers.SerializerMethodField()
    checklist_instance_name = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'assignment_type', 'checklist_template', 'checklist_template_name',
            'checklist_item', 'checklist_item_title', 'checklist_instance',
            'checklist_instance_name', 'assignee_type', 'assignee_user',
            'assignee_user_name', 'assignee_group', 'assignee_group_name',
            'assignee_parameter', 'is_exclusive', 'auto_notify',
            'assignee_display', 'target_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assignee_user_name(self, obj):
        if obj.assignee_user:
            return obj.assignee_user.username
        return None

    def get_assignee_group_name(self, obj):
        if obj.assignee_group:
            return obj.assignee_group.name
        return None

    def get_checklist_template_name(self, obj):
        if obj.checklist_template:
            return obj.checklist_template.name
        return None

    def get_checklist_item_title(self, obj):
        if obj.checklist_item:
            return obj.checklist_item.title
        return None

    def get_checklist_instance_name(self, obj):
        if obj.checklist_instance:
            return obj.checklist_instance.name
        return None


class AssignmentListSerializer(serializers.ModelSerializer):
    assignee_display = serializers.ReadOnlyField()
    target_display = serializers.ReadOnlyField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'assignment_type', 'assignee_type', 'assignee_display',
            'target_display', 'is_exclusive', 'auto_notify', 'created_at'
        ]


class AssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = [
            'assignment_type', 'checklist_template', 'checklist_item',
            'checklist_instance', 'assignee_type', 'assignee_user',
            'assignee_group', 'assignee_parameter', 'is_exclusive', 'auto_notify'
        ]
        extra_kwargs = {
            'checklist_template': {'required': False, 'allow_null': True},
            'checklist_item': {'required': False, 'allow_null': True},
            'checklist_instance': {'required': False, 'allow_null': True},
            'assignee_user': {'required': False, 'allow_null': True},
            'assignee_group': {'required': False, 'allow_null': True},
            'assignee_parameter': {'required': False, 'allow_blank': True},
        }

    def validate(self, data):
        assignment_type = data.get('assignment_type')
        assignee_type = data.get('assignee_type')
        
        if assignment_type == 'template' and not data.get('checklist_template'):
            raise serializers.ValidationError(
                {'checklist_template': 'This field is required for template assignment'}
            )
        if assignment_type == 'item' and not data.get('checklist_item'):
            raise serializers.ValidationError(
                {'checklist_item': 'This field is required for item assignment'}
            )
        if assignment_type == 'runtime' and not data.get('checklist_instance'):
            raise serializers.ValidationError(
                {'checklist_instance': 'This field is required for runtime assignment'}
            )
        
        if assignee_type == 'user' and not data.get('assignee_user'):
            raise serializers.ValidationError(
                {'assignee_user': 'This field is required for user assignment'}
            )
        if assignee_type == 'group' and not data.get('assignee_group'):
            raise serializers.ValidationError(
                {'assignee_group': 'This field is required for group assignment'}
            )
        if assignee_type == 'parameter' and not data.get('assignee_parameter'):
            raise serializers.ValidationError(
                {'assignee_parameter': 'This field is required for parameter assignment'}
            )
        
        return data


class AssignmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = [
            'assignment_type', 'checklist_template', 'checklist_item',
            'checklist_instance', 'assignee_type', 'assignee_user',
            'assignee_group', 'assignee_parameter', 'is_exclusive', 'auto_notify'
        ]
        extra_kwargs = {
            'assignment_type': {'required': False},
            'assignee_type': {'required': False},
            'checklist_template': {'required': False, 'allow_null': True},
            'checklist_item': {'required': False, 'allow_null': True},
            'checklist_instance': {'required': False, 'allow_null': True},
            'assignee_user': {'required': False, 'allow_null': True},
            'assignee_group': {'required': False, 'allow_null': True},
            'assignee_parameter': {'required': False, 'allow_blank': True},
            'is_exclusive': {'required': False},
            'auto_notify': {'required': False},
        }


class AssignmentMinimalSerializer(serializers.ModelSerializer):
    assignee_display = serializers.ReadOnlyField()

    class Meta:
        model = Assignment
        fields = ['id', 'assignment_type', 'assignee_type', 'assignee_display', 'is_exclusive']


class ResolvedAssigneeSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    assignment_source = serializers.CharField()
    is_exclusive = serializers.BooleanField()
