from django.utils import timezone
from django.db import transaction


class ChecklistInstanceService:
    @staticmethod
    @transaction.atomic
    def create_from_template(user, template, version=None, name=None, notes=''):
        from apps.checklist_instances.models import ChecklistInstance, ChecklistItemInstance

        if version is None:
            version = template.current_version

        instance_name = name or f"{template.name} - {timezone.now().strftime('%Y-%m-%d %H:%M')}"

        instance = ChecklistInstance.objects.create(
            template=template,
            version=version,
            name=instance_name,
            user=user,
            status='draft',
            notes=notes
        )

        if version:
            items = version.items.all().order_by('order')
            item_mapping = {}

            for item in items:
                item_instance = ChecklistItemInstance.objects.create(
                    instance=instance,
                    item=item,
                    title=item.title,
                    description=item.description,
                    order=item.order,
                    is_completed=False,
                    is_visible=True
                )
                item_mapping[item.id] = item_instance

            for item in items:
                if item.parent_id and item.parent_id in item_mapping:
                    item_mapping[item.id].parent = item_mapping[item.parent_id]
                    item_mapping[item.id].save(update_fields=['parent'])

        return instance

    @staticmethod
    def update_progress(instance):
        instance.update_progress()

    @staticmethod
    @transaction.atomic
    def apply_to_template(instance, create_new_version=True, version_notes=''):
        from apps.checklist_instances.models import CompletionLog

        if not instance.template:
            raise ValueError("Instance has no associated template")

        template = instance.template
        changes_detected = False

        if create_new_version:
            new_version = ChecklistInstanceService._create_new_version(
                template, instance, version_notes
            )
            changes_detected = True
        else:
            ChecklistInstanceService._update_current_version(instance)

        CompletionLog.objects.create(
            instance=instance,
            action='complete',
            user=instance.user,
            notes=f"Applied to template. New version created: {create_new_version}"
        )

        return changes_detected

    @staticmethod
    def _create_new_version(template, instance, version_notes):
        from apps.checklists.models import ChecklistVersion, ChecklistItem

        latest_version = template.versions.order_by('-version_number').first()
        new_version_number = (latest_version.version_number + 1) if latest_version else 1

        new_version = ChecklistVersion.objects.create(
            template=template,
            version_number=new_version_number,
            is_active=False,
            changelog=version_notes or f"Updated from instance: {instance.name}"
        )

        item_mapping = {}
        for item_instance in instance.item_instances.all().order_by('order'):
            new_item = ChecklistItem.objects.create(
                version=new_version,
                title=item_instance.title,
                description=item_instance.description,
                order=item_instance.order,
                is_required=item_instance.item.is_required if item_instance.item else True,
            )
            item_mapping[item_instance.id] = new_item

        for item_instance in instance.item_instances.all():
            if item_instance.parent_id and item_instance.parent_id in item_mapping:
                item_mapping[item_instance.id].parent = item_mapping[item_instance.parent_id]
                item_mapping[item_instance.id].save(update_fields=['parent'])

        template.set_active_version(new_version)

        return new_version

    @staticmethod
    def _update_current_version(instance):
        if not instance.version:
            return

        from apps.checklists.models import ChecklistVersion, ChecklistItem

        template = instance.version.template
        latest = template.versions.order_by('-version_number').first()
        new_number = (latest.version_number + 1) if latest else 1

        new_version = ChecklistVersion.objects.create(
            template=template,
            version_number=new_number,
            is_active=False,
            changelog=f"Updated from instance: {instance.name}",
        )

        item_mapping = {}
        for item_instance in instance.item_instances.filter(parent__isnull=True).order_by('order'):
            new_item = ChecklistItem.objects.create(
                version=new_version,
                title=item_instance.title,
                description=item_instance.description,
                order=item_instance.order,
                is_required=item_instance.item.is_required if item_instance.item else True,
            )
            item_mapping[item_instance.id] = new_item

        for item_instance in instance.item_instances.filter(parent__isnull=False).order_by('order'):
            parent = item_mapping.get(item_instance.parent_id)
            new_item = ChecklistItem.objects.create(
                version=new_version,
                parent=parent,
                title=item_instance.title,
                description=item_instance.description,
                order=item_instance.order,
                is_required=item_instance.item.is_required if item_instance.item else True,
            )
            item_mapping[item_instance.id] = new_item

        template.set_active_version(new_version)


    @staticmethod
    @transaction.atomic
    def set_placeholder_value(instance, placeholder_key, value):
        """Set a placeholder value and update child item visibility."""
        from apps.checklist_instances.models import ChecklistItemInstance

        # Find the item instance that IS the placeholder (item.placeholder.name == placeholder_key)
        placeholder_instance = instance.item_instances.filter(
            item__placeholder__name=placeholder_key
        ).select_related('item__placeholder').first()

        if placeholder_instance is None:
            raise ValueError(f"Placeholder '{placeholder_key}' not found in this instance")

        # Set the value
        placeholder_instance.placeholder_value = value
        placeholder_instance.save(update_fields=['placeholder_value'])

        # Update visibility of all child item instances
        is_visible = bool(value.strip()) if value else False
        instance.item_instances.filter(parent=placeholder_instance).update(is_visible=is_visible)

        return placeholder_instance


class CompletionLogService:
    @staticmethod
    def log_item_completion(item_instance, user, action='complete', duration_seconds=None):
        from apps.checklist_instances.models import CompletionLog

        return CompletionLog.objects.create(
            instance=item_instance.instance,
            item_instance=item_instance,
            action=action,
            user=user,
            duration_seconds=duration_seconds
        )

    @staticmethod
    def log_instance_status_change(instance, user, action, notes=''):
        from apps.checklist_instances.models import CompletionLog

        return CompletionLog.objects.create(
            instance=instance,
            action=action,
            user=user,
            notes=notes
        )
