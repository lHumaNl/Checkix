from django.db import transaction

from apps.todo.models import TodoList, TodoItem


class TodoService:
    @staticmethod
    @transaction.atomic
    def convert_to_checklist(todo_list, title, description='', priority='medium'):
        """
        Convert a todo list to a checklist by creating a new item.
        This is useful for creating quick todos from a list.
        """
        item = TodoItem.objects.create(
            todo_list=todo_list,
            title=title,
            description=description,
            priority=priority,
            order=todo_list.items.count()
        )
        return item

    @staticmethod
    @transaction.atomic
    def bulk_complete_items(todo_list, item_ids):
        """
        Mark multiple items as completed.
        """
        from django.utils import timezone
        updated_count = todo_list.items.filter(
            id__in=item_ids
        ).update(
            status='completed',
            completed_at=timezone.now()
        )
        return updated_count

    @staticmethod
    @transaction.atomic
    def bulk_uncomplete_items(todo_list, item_ids):
        """
        Mark multiple items as pending.
        """
        updated_count = todo_list.items.filter(
            id__in=item_ids
        ).update(
            status='pending',
            completed_at=None
        )
        return updated_count

    @staticmethod
    @transaction.atomic
    def reorder_items(todo_list, item_orders):
        """
        Reorder items within a todo list.
        item_orders is a list of dicts with 'id' and 'order' keys.
        """
        for item_order in item_orders:
            todo_list.items.filter(
                id=item_order['id']
            ).update(order=item_order['order'])

    @staticmethod
    @transaction.atomic
    def move_item_to_list(item, target_list):
        """
        Move an item to a different todo list.
        """
        item.todo_list = target_list
        item.order = target_list.items.count()
        item.save()
        return item

    @staticmethod
    @transaction.atomic
    def duplicate_todo_list(todo_list, new_name=None):
        """
        Create a copy of a todo list with all its items.
        """
        original_tags = list(todo_list.tags.all())

        new_list = TodoList.objects.create(
            name=new_name or f"{todo_list.name} (Copy)",
            description=todo_list.description,
            user=todo_list.user,
            folder=todo_list.folder,
            status='active',
            priority=todo_list.priority,
            icon=todo_list.icon,
            is_favorite=False,
        )
        new_list.tags.set(original_tags)

        items_mapping = {}
        for item in todo_list.items.all():
            new_item = TodoItem.objects.create(
                todo_list=new_list,
                title=item.title,
                description=item.description,
                status='pending',
                order=item.order,
                priority=item.priority,
            )
            items_mapping[item.id] = new_item

        for item in todo_list.items.filter(parent__isnull=False):
            if item.parent_id in items_mapping:
                new_child = items_mapping.get(item.id)
                if new_child:
                    new_child.parent = items_mapping[item.parent_id]
                    new_child.save()

        return new_list

    @staticmethod
    def get_todo_list_stats(todo_list):
        """
        Get statistics for a todo list.
        """
        items = todo_list.items.all()
        total = items.count()
        completed = items.filter(status='completed').count()
        pending = items.filter(status='pending').count()
        cancelled = items.filter(status='cancelled').count()

        return {
            'total_items': total,
            'completed_items': completed,
            'pending_items': pending,
            'cancelled_items': cancelled,
            'progress_percentage': round((completed / total) * 100) if total > 0 else 0,
        }

    @staticmethod
    def get_user_todo_stats(user):
        """
        Get overall todo statistics for a user.
        """
        todo_lists = TodoList.objects.filter(user=user, is_deleted=False)
        total_lists = todo_lists.count()
        active_lists = todo_lists.filter(status='active').count()
        completed_lists = todo_lists.filter(status='completed').count()
        favorite_lists = todo_lists.filter(is_favorite=True).count()

        all_items = TodoItem.objects.filter(todo_list__user=user, todo_list__is_deleted=False)
        total_items = all_items.count()
        completed_items = all_items.filter(status='completed').count()
        pending_items = all_items.filter(status='pending').count()

        return {
            'total_lists': total_lists,
            'active_lists': active_lists,
            'completed_lists': completed_lists,
            'favorite_lists': favorite_lists,
            'total_items': total_items,
            'completed_items': completed_items,
            'pending_items': pending_items,
        }
