from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.stats.models import ChecklistUsageStats


class ChecklistUsageStatsSerializer(BaseModelSerializer):
    template_id = serializers.PrimaryKeyRelatedField(read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    avg_completion_time_minutes = serializers.ReadOnlyField()
    avg_completion_time_hours = serializers.ReadOnlyField()

    class Meta:
        model = ChecklistUsageStats
        fields = [
            'id', 'template', 'template_id', 'template_name', 'date',
            'instances_created', 'instances_completed',
            'avg_completion_time_seconds', 'avg_completion_time_minutes',
            'avg_completion_time_hours', 'avg_completion_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields


class ChecklistUsageStatsListSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    avg_completion_time_minutes = serializers.ReadOnlyField()

    class Meta:
        model = ChecklistUsageStats
        fields = [
            'id', 'template_name', 'date', 'instances_created',
            'instances_completed', 'avg_completion_time_minutes',
            'avg_completion_percentage'
        ]


class ChecklistUsageStatsMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistUsageStats
        fields = ['id', 'date', 'instances_created', 'instances_completed']


class DateRangeSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    end_date = serializers.DateField()


class StatsSummarySerializer(serializers.Serializer):
    total_instances_created = serializers.IntegerField()
    total_instances_completed = serializers.IntegerField()
    avg_completion_time_seconds = serializers.FloatField(allow_null=True)
    avg_completion_percentage = serializers.FloatField(allow_null=True)
    daily_stats = serializers.ListField()


class TemplateStatsSummarySerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    template_name = serializers.CharField()
    total_instances = serializers.IntegerField()
    completed_instances = serializers.IntegerField()
    avg_completion_time_seconds = serializers.FloatField(allow_null=True)
    avg_completion_percentage = serializers.FloatField(allow_null=True)
    completion_rate = serializers.FloatField()


class OverallStatsSerializer(serializers.Serializer):
    total_templates = serializers.IntegerField()
    total_instances_created = serializers.IntegerField()
    total_instances_completed = serializers.IntegerField()
    avg_completion_rate = serializers.FloatField()
    top_templates = serializers.ListField()
    recent_activity = serializers.ListField()
