from django.db import transaction
from django.utils import timezone
from django.core.paginator import Paginator

from apps.audit.models import AuditLog


class AuditService:
    @staticmethod
    def log_action(user, action, entity_type, entity_id, entity_name='',
                   checklist_instance=None, changes=None, request=None, **kwargs):
        return AuditLog.log_action(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            checklist_instance=checklist_instance,
            changes=changes,
            request=request,
            **kwargs
        )

    @staticmethod
    def log_create(user, entity_type, entity_id, entity_name='', changes=None, request=None, **kwargs):
        return AuditService.log_action(
            user=user,
            action='created',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes or {},
            request=request,
            **kwargs
        )

    @staticmethod
    def log_update(user, entity_type, entity_id, entity_name='', changes=None, request=None, **kwargs):
        return AuditService.log_action(
            user=user,
            action='updated',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes or {},
            request=request,
            **kwargs
        )

    @staticmethod
    def log_delete(user, entity_type, entity_id, entity_name='', request=None, **kwargs):
        return AuditService.log_action(
            user=user,
            action='deleted',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            request=request,
            **kwargs
        )

    @staticmethod
    def log_complete(user, entity_type, entity_id, entity_name='', changes=None, request=None, **kwargs):
        return AuditService.log_action(
            user=user,
            action='completed',
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            changes=changes or {},
            request=request,
            **kwargs
        )

    @staticmethod
    def get_user_audit_logs(user, limit=100):
        return AuditLog.objects.filter(user=user)[:limit]

    @staticmethod
    def get_entity_audit_logs(entity_type, entity_id, limit=100):
        return AuditLog.objects.filter(
            entity_type=entity_type,
            entity_id=entity_id
        )[:limit]

    @staticmethod
    def get_checklist_instance_audit_logs(checklist_instance, limit=100):
        return AuditLog.objects.filter(
            checklist_instance=checklist_instance
        )[:limit]

    @staticmethod
    def get_audit_summary(days=30):
        from django.db.models import Count
        from datetime import timedelta

        start_date = timezone.now() - timedelta(days=days)

        total_logs = AuditLog.objects.filter(created_at__gte=start_date).count()

        action_counts = dict(
            AuditLog.objects.filter(created_at__gte=start_date)
            .values('action')
            .annotate(count=Count('action'))
            .values_list('action', 'count')
        )

        entity_type_counts = dict(
            AuditLog.objects.filter(created_at__gte=start_date)
            .values('entity_type')
            .annotate(count=Count('entity_type'))
            .values_list('entity_type', 'count')
        )

        recent_actions = list(
            AuditLog.objects.filter(created_at__gte=start_date)
            .order_by('-created_at')
            .values('id', 'action', 'entity_type', 'entity_id', 'entity_name', 'created_at')[:10]
        )

        return {
            'total_logs': total_logs,
            'action_counts': action_counts,
            'entity_type_counts': entity_type_counts,
            'recent_actions': recent_actions,
        }

    @staticmethod
    def cleanup_old_logs(days_to_keep=90):
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        deleted_count, _ = AuditLog.objects.filter(created_at__lt=cutoff_date).delete()
        return deleted_count
