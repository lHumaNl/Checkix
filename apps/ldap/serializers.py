from rest_framework import serializers
from apps.core.serializers import BaseModelSerializer
from apps.ldap.models import LDAPSyncLog


class LDAPSyncLogSerializer(BaseModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration_seconds = serializers.FloatField(read_only=True)

    class Meta:
        model = LDAPSyncLog
        fields = [
            'id', 'status', 'status_display',
            'users_synced', 'groups_synced', 'users_created', 'groups_created',
            'users_updated', 'groups_updated', 'error_message', 'started_at',
            'completed_at', 'duration_seconds', 'details', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class LDAPSyncLogListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration_seconds = serializers.FloatField(read_only=True)

    class Meta:
        model = LDAPSyncLog
        fields = [
            'id', 'status', 'status_display',
            'users_synced', 'groups_synced', 'users_created', 'groups_created',
            'started_at', 'completed_at', 'duration_seconds'
        ]


class LDAPTestConnectionSerializer(serializers.Serializer):
    pass


class LDAPTestConnectionResultSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    server_reachable = serializers.BooleanField()
    bind_successful = serializers.BooleanField()
    base_dn_accessible = serializers.BooleanField()
    user_count = serializers.IntegerField(allow_null=True)
    group_count = serializers.IntegerField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)


class LDAPSyncNowSerializer(serializers.Serializer):
    pass


class LDAPSyncResultSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    users_synced = serializers.IntegerField()
    users_created = serializers.IntegerField()
    users_updated = serializers.IntegerField()
    error_message = serializers.CharField(allow_null=True)


class LDAPStatsSerializer(serializers.Serializer):
    configured = serializers.BooleanField()
    total_syncs = serializers.IntegerField()
    successful_syncs = serializers.IntegerField()
    failed_syncs = serializers.IntegerField()
    success_rate = serializers.FloatField()
    last_sync_at = serializers.DateTimeField(allow_null=True)
    last_sync_status = serializers.CharField(allow_null=True)
