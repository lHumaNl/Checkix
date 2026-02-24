from django.db import transaction

from apps.checklists.models import (
    ChecklistTemplate,
    ChecklistVersion,
    ChecklistItem,
    Placeholder,
    PlaceholderOption
)
from apps.checklists.exceptions import ChecklistVersionError


class ChecklistService:
    @staticmethod
    @transaction.atomic
    def create_initial_version(template, items_data=None):
        version = ChecklistVersion.objects.create(
            template=template,
            version_number=1,
            changelog='Initial version',
            is_active=True
        )
        
        if items_data:
            ChecklistService._create_items(version, items_data)
        
        template.current_version = version
        template.save()
        
        return version

    @staticmethod
    @transaction.atomic
    def create_version(template, changelog='', items_data=None):
        latest_version = template.versions.order_by('-version_number').first()
        new_version_number = (latest_version.version_number + 1) if latest_version else 1
        
        if items_data is None:
            new_version = template.create_new_version(changelog)
        else:
            new_version = ChecklistVersion.objects.create(
                template=template,
                version_number=new_version_number,
                changelog=changelog,
                is_active=False
            )
            ChecklistService._create_items(new_version, items_data)
        
        return new_version

    @staticmethod
    def _create_items(version, items_data, parent=None):
        created_items = []
        for idx, item_data in enumerate(items_data):
            children_data = item_data.get('children', [])
            
            item = ChecklistItem.objects.create(
                version=version,
                parent=parent,
                title=item_data.get('title', ''),
                description=item_data.get('description', ''),
                order=item_data.get('order', idx),
                is_required=item_data.get('is_required', True),
                priority=item_data.get('priority', 'medium'),
                placeholder=item_data.get('placeholder'),
                is_halt=item_data.get('is_halt', False),
                halt_message=item_data.get('halt_message', '')
            )
            created_items.append(item)
            
            if children_data:
                ChecklistService._create_items(version, children_data, parent=item)
        
        return created_items

    @staticmethod
    @transaction.atomic
    def duplicate_template(template, new_name, new_folder=None, user=None):
        new_template = ChecklistTemplate.objects.create(
            name=new_name,
            description=template.description,
            user=user or template.user,
            folder=new_folder or template.folder,
            sequential_mode=template.sequential_mode,
            icon=template.icon,
            is_favorite=False,
            estimated_duration=template.estimated_duration,
            status=template.status,
            category=template.category
        )
        
        new_template.tags.set(template.tags.all())
        
        current_version = template.current_version
        if current_version:
            new_version = ChecklistVersion.objects.create(
                template=new_template,
                version_number=1,
                changelog=f'Copied from {template.name} v{current_version.version_number}',
                is_active=True
            )
            
            ChecklistService._copy_items(current_version, new_version)
            
            ChecklistService._copy_placeholders(current_version, new_version)
            
            new_template.current_version = new_version
            new_template.save()
        
        return new_template

    @staticmethod
    def _copy_items(source_version, target_version):
        items_map = {}
        
        root_items = source_version.items.filter(parent__isnull=True)
        
        for item in root_items:
            ChecklistService._copy_item_recursive(item, target_version, None, items_map)

    @staticmethod
    def _copy_item_recursive(source_item, target_version, parent, items_map):
        new_item = ChecklistItem.objects.create(
            version=target_version,
            parent=parent,
            title=source_item.title,
            description=source_item.description,
            order=source_item.order,
            is_required=source_item.is_required,
            priority=source_item.priority,
            is_halt=source_item.is_halt,
            halt_message=source_item.halt_message
        )
        
        items_map[source_item.id] = new_item
        
        for child in source_item.children.all():
            ChecklistService._copy_item_recursive(child, target_version, new_item, items_map)
        
        return new_item

    @staticmethod
    def _copy_placeholders(source_version, target_version):
        for placeholder in source_version.placeholders.all():
            new_placeholder = Placeholder.objects.create(
                name=placeholder.name,
                placeholder_type=placeholder.placeholder_type,
                is_required=placeholder.is_required,
                default_value=placeholder.default_value,
                version=target_version
            )
            
            for option in placeholder.options.all():
                PlaceholderOption.objects.create(
                    placeholder=new_placeholder,
                    value=option.value,
                    display_text=option.display_text,
                    order=option.order
                )

    @staticmethod
    @transaction.atomic
    def delete_version(version):
        if version.is_active:
            raise ChecklistVersionError("Cannot delete the active version")
        
        if version.template.versions.count() == 1:
            raise ChecklistVersionError("Cannot delete the only version")
        
        version.delete()

    @staticmethod
    @transaction.atomic
    def move_item_to_parent(item, new_parent):
        if new_parent:
            if new_parent.version != item.version:
                raise ChecklistVersionError("Item and new parent must be in the same version")
            
            all_children = item.get_all_children()
            if new_parent in all_children or new_parent == item:
                raise ChecklistVersionError("Cannot move item to itself or its descendants")
        
        item.parent = new_parent
        item.save()
        return item

    @staticmethod
    def get_template_summary(template):
        versions = template.versions.all()
        total_items = 0
        required_items = 0
        halt_items = 0
        
        if template.current_version:
            items = template.current_version.items.all()
            total_items = items.count()
            required_items = items.filter(is_required=True).count()
            halt_items = items.filter(is_halt=True).count()
        
        return {
            'id': template.id,
            'name': template.name,
            'versions_count': len(versions),
            'current_version': template.current_version.version_number if template.current_version else None,
            'total_items': total_items,
            'required_items': required_items,
            'halt_items': halt_items,
        }
