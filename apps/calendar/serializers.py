from rest_framework import serializers
from django.utils import timezone

from apps.core.serializers import BaseModelSerializer
from apps.calendar.models import CalendarEvent


class RecurrenceRuleSerializer(serializers.Serializer):
    interval = serializers.IntegerField(min_value=1, default=1)
    count = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    days_of_week = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False,
        allow_empty=True
    )
    day_of_month = serializers.IntegerField(min_value=1, max_value=31, required=False, allow_null=True)


class TemplatePresetsSerializer(serializers.Serializer):
    assignees = serializers.ListField(child=serializers.CharField(), required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    priority = serializers.CharField(required=False, allow_null=True)
    custom_fields = serializers.DictField(required=False)


class CalendarEventSerializer(BaseModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(read_only=True)
    checklist_template_id = serializers.PrimaryKeyRelatedField(
        read_only=True, allow_null=True
    )
    todo_list_id = serializers.PrimaryKeyRelatedField(
        read_only=True, allow_null=True
    )
    recurrence_rule = RecurrenceRuleSerializer(required=False, allow_null=True)
    template_presets = TemplatePresetsSerializer(required=False, allow_null=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'user_id', 'event_type', 'checklist_template_id',
            'todo_list_id', 'start_datetime', 'end_datetime', 'all_day',
            'recurrence', 'recurrence_rule', 'location', 'description',
            'color', 'reminder_minutes_before', 'template_presets',
            'is_completed', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id', 'completed_at']


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    recurrence_rule = RecurrenceRuleSerializer(required=False, allow_null=True)
    template_presets = TemplatePresetsSerializer(required=False, allow_null=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'title', 'event_type', 'checklist_template', 'todo_list',
            'start_datetime', 'end_datetime', 'all_day', 'recurrence',
            'recurrence_rule', 'location', 'description', 'color',
            'reminder_minutes_before', 'template_presets'
        ]

    def validate(self, data):
        if data.get('all_day') and data.get('end_datetime'):
            data['end_datetime'] = None
        if data.get('recurrence') == 'once':
            data['recurrence_rule'] = None
        if data.get('event_type') == 'checklist' and not data.get('checklist_template'):
            raise serializers.ValidationError({
                'checklist_template': 'This field is required for checklist events.'
            })
        if data.get('event_type') == 'todo' and not data.get('todo_list'):
            raise serializers.ValidationError({
                'todo_list': 'This field is required for todo events.'
            })
        return data


class CalendarEventUpdateSerializer(serializers.ModelSerializer):
    recurrence_rule = RecurrenceRuleSerializer(required=False, allow_null=True)
    template_presets = TemplatePresetsSerializer(required=False, allow_null=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'title', 'event_type', 'checklist_template', 'todo_list',
            'start_datetime', 'end_datetime', 'all_day', 'recurrence',
            'recurrence_rule', 'location', 'description', 'color',
            'reminder_minutes_before', 'template_presets'
        ]
        extra_kwargs = {
            'title': {'required': False},
            'event_type': {'required': False},
            'start_datetime': {'required': False},
        }

    def validate(self, data):
        event_type = data.get('event_type', self.instance.event_type if self.instance else None)
        if data.get('all_day') and data.get('end_datetime'):
            data['end_datetime'] = None
        if data.get('recurrence') == 'once':
            data['recurrence_rule'] = None
        if event_type == 'checklist':
            template = data.get('checklist_template', self.instance.checklist_template if self.instance else None)
            if template is None and 'checklist_template' not in data:
                pass
            elif template is None and data.get('checklist_template') is None and self.instance:
                pass
        if event_type == 'todo':
            todo_list = data.get('todo_list', self.instance.todo_list if self.instance else None)
            if todo_list is None and 'todo_list' not in data:
                pass
        return data


class CalendarEventMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'event_type', 'start_datetime', 'end_datetime',
            'all_day', 'color', 'is_completed'
        ]


class CalendarEventRescheduleSerializer(serializers.Serializer):
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField(required=False, allow_null=True)


class CalendarEventCompleteSerializer(serializers.Serializer):
    completed = serializers.BooleanField(default=True)


class DateRangeSerializer(serializers.Serializer):
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError('start_date must be before end_date')
        return data
