import uuid
from django.db import transaction
from django.utils import timezone

from apps.run_links.models import RunLink


class RunLinkService:
    @staticmethod
    @transaction.atomic
    def create_run_link(checklist_template, name, created_by, access_type='public',
                        preset_values=None, expires_at=None, max_uses=None):
        run_link = RunLink.objects.create(
            checklist_template=checklist_template,
            name=name,
            created_by=created_by,
            access_type=access_type,
            preset_values=preset_values or {},
            expires_at=expires_at,
            max_uses=max_uses,
        )
        return run_link

    @staticmethod
    @transaction.atomic
    def update_run_link(run_link, **kwargs):
        for attr, value in kwargs.items():
            if hasattr(run_link, attr):
                setattr(run_link, attr, value)
        run_link.save()
        return run_link

    @staticmethod
    @transaction.atomic
    def delete_run_link(run_link):
        run_link.delete()

    @staticmethod
    def get_run_link_by_unique_id(unique_id):
        try:
            return RunLink.objects.select_related('checklist_template', 'created_by').get(unique_id=unique_id)
        except RunLink.DoesNotExist:
            return None

    @staticmethod
    def get_template_run_links(checklist_template):
        return RunLink.objects.filter(
            checklist_template=checklist_template
        ).select_related('created_by').order_by('-created_at')

    @staticmethod
    def get_user_run_links(user):
        return RunLink.objects.filter(
            created_by=user
        ).select_related('checklist_template').order_by('-created_at')

    @staticmethod
    @transaction.atomic
    def execute_run_link(unique_id, user=None, preset_overrides=None):
        run_link = RunLinkService.get_run_link_by_unique_id(unique_id)

        if not run_link:
            raise ValueError('Run link not found')

        if not run_link.is_valid:
            if run_link.is_expired:
                raise ValueError('Run link has expired')
            if run_link.is_max_uses_reached:
                raise ValueError('Run link has reached maximum usage')

        run_link.increment_usage()

        from apps.checklist_instances.services import ChecklistInstanceService

        merged_presets = {**run_link.preset_values, **(preset_overrides or {})}

        instance = ChecklistInstanceService.create_from_template(
            template=run_link.checklist_template,
            user=user or run_link.created_by,
        )

        for placeholder_key, value in merged_presets.items():
            try:
                ChecklistInstanceService.set_placeholder_value(
                    instance, str(placeholder_key), str(value)
                )
            except ValueError:
                pass  # Skip if placeholder not found in this template

        return instance

    @staticmethod
    def get_valid_run_links(checklist_template):
        from django.db.models import Q
        now = timezone.now()
        return RunLink.objects.filter(
            checklist_template=checklist_template
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gte=now)
        ).order_by('-created_at')

    @staticmethod
    @transaction.atomic
    def cleanup_expired_links():
        now = timezone.now()
        expired_links = RunLink.objects.filter(expires_at__lt=now)
        count = expired_links.count()
        expired_links.delete()
        return count

    @staticmethod
    def regenerate_unique_id(run_link):
        run_link.unique_id = uuid.uuid4()
        run_link.save(update_fields=['unique_id', 'updated_at'])
        return run_link

    @staticmethod
    def get_run_link_stats(run_link):
        return {
            'usage_count': run_link.usage_count,
            'max_uses': run_link.max_uses,
            'remaining_uses': (
                run_link.max_uses - run_link.usage_count
                if run_link.max_uses is not None else None
            ),
            'is_expired': run_link.is_expired,
            'is_valid': run_link.is_valid,
            'expires_at': run_link.expires_at,
        }
