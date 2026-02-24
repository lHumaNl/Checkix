from django.contrib.auth.models import User
from django.db import transaction

from apps.assignments.models import Assignment


class AssignmentService:
    @staticmethod
    def get_template_assignments(template):
        return Assignment.objects.filter(
            assignment_type='template',
            checklist_template=template
        ).select_related('assignee_user', 'assignee_group')

    @staticmethod
    def get_item_assignments(item):
        return Assignment.objects.filter(
            assignment_type='item',
            checklist_item=item
        ).select_related('assignee_user', 'assignee_group')

    @staticmethod
    def get_instance_assignments(instance):
        return Assignment.objects.filter(
            assignment_type='runtime',
            checklist_instance=instance
        ).select_related('assignee_user', 'assignee_group')

    @staticmethod
    def resolve_assignees_for_template(template, placeholder_values=None):
        assignments = AssignmentService.get_template_assignments(template)
        return AssignmentService._resolve_assignees_from_assignments(
            assignments, placeholder_values
        )

    @staticmethod
    def resolve_assignees_for_item(item, placeholder_values=None):
        assignments = AssignmentService.get_item_assignments(item)
        return AssignmentService._resolve_assignees_from_assignments(
            assignments, placeholder_values
        )

    @staticmethod
    def resolve_assignees_for_instance(instance, placeholder_values=None):
        assignments = AssignmentService.get_instance_assignments(instance)
        return AssignmentService._resolve_assignees_from_assignments(
            assignments, placeholder_values
        )

    @staticmethod
    def _resolve_assignees_from_assignments(assignments, placeholder_values=None):
        resolved_users = []
        exclusive_user = None
        placeholder_values = placeholder_values or {}

        for assignment in assignments:
            users = AssignmentService._get_users_from_assignment(
                assignment, placeholder_values
            )
            
            if assignment.is_exclusive and users:
                exclusive_user = users[0]
                break
            
            resolved_users.extend(users)

        if exclusive_user:
            return [exclusive_user]
        
        seen_ids = set()
        unique_users = []
        for user in resolved_users:
            if user.id not in seen_ids:
                seen_ids.add(user.id)
                unique_users.append(user)
        
        return unique_users

    @staticmethod
    def _get_users_from_assignment(assignment, placeholder_values):
        users = []
        
        if assignment.assignee_type == 'user' and assignment.assignee_user:
            users.append(assignment.assignee_user)
        
        elif assignment.assignee_type == 'group' and assignment.assignee_group:
            group_members = assignment.assignee_group.members.all()
            users.extend(group_members)
        
        elif assignment.assignee_type == 'parameter':
            param_name = assignment.assignee_parameter
            if param_name in placeholder_values:
                user_identifier = placeholder_values[param_name]
                user = AssignmentService._find_user_by_identifier(user_identifier)
                if user:
                    users.append(user)
        
        elif assignment.assignee_type == 'manager':
            if assignment.assignment_type == 'runtime' and assignment.checklist_instance:
                instance_user = assignment.checklist_instance.user
                if instance_user and hasattr(instance_user, 'profile'):
                    manager = instance_user.profile.manager
                    if manager:
                        users.append(manager)
        
        return users

    @staticmethod
    def _find_user_by_identifier(identifier):
        try:
            return User.objects.get(id=int(identifier))
        except (ValueError, User.DoesNotExist):
            pass
        
        try:
            return User.objects.get(username=identifier)
        except User.DoesNotExist:
            pass
        
        try:
            return User.objects.get(email=identifier)
        except User.DoesNotExist:
            pass
        
        return None

    @staticmethod
    @transaction.atomic
    def create_template_assignment(template, assignee_type, assignee=None, 
                                   assignee_group=None, assignee_parameter='',
                                   is_exclusive=False, auto_notify=True, user=None):
        return Assignment.objects.create(
            user=user or template.user,
            assignment_type='template',
            checklist_template=template,
            assignee_type=assignee_type,
            assignee_user=assignee if assignee_type == 'user' else None,
            assignee_group=assignee_group if assignee_type == 'group' else None,
            assignee_parameter=assignee_parameter if assignee_type == 'parameter' else '',
            is_exclusive=is_exclusive,
            auto_notify=auto_notify
        )

    @staticmethod
    @transaction.atomic
    def create_item_assignment(item, assignee_type, assignee=None,
                               assignee_group=None, assignee_parameter='',
                               is_exclusive=False, auto_notify=True, user=None):
        return Assignment.objects.create(
            user=user or (item.version.template.user if item.version else None),
            assignment_type='item',
            checklist_item=item,
            assignee_type=assignee_type,
            assignee_user=assignee if assignee_type == 'user' else None,
            assignee_group=assignee_group if assignee_type == 'group' else None,
            assignee_parameter=assignee_parameter if assignee_type == 'parameter' else '',
            is_exclusive=is_exclusive,
            auto_notify=auto_notify
        )

    @staticmethod
    @transaction.atomic
    def create_instance_assignment(instance, assignee_type, assignee=None,
                                   assignee_group=None, assignee_parameter='',
                                   is_exclusive=False, auto_notify=True, user=None):
        return Assignment.objects.create(
            user=user or instance.user,
            assignment_type='runtime',
            checklist_instance=instance,
            assignee_type=assignee_type,
            assignee_user=assignee if assignee_type == 'user' else None,
            assignee_group=assignee_group if assignee_type == 'group' else None,
            assignee_parameter=assignee_parameter if assignee_type == 'parameter' else '',
            is_exclusive=is_exclusive,
            auto_notify=auto_notify
        )

    @staticmethod
    @transaction.atomic
    def copy_template_assignments_to_instance(template, instance):
        template_assignments = AssignmentService.get_template_assignments(template)
        created_assignments = []
        
        for assignment in template_assignments:
            new_assignment = Assignment.objects.create(
                user=instance.user,
                assignment_type='runtime',
                checklist_instance=instance,
                assignee_type=assignment.assignee_type,
                assignee_user=assignment.assignee_user,
                assignee_group=assignment.assignee_group,
                assignee_parameter=assignment.assignee_parameter,
                is_exclusive=assignment.is_exclusive,
                auto_notify=assignment.auto_notify
            )
            created_assignments.append(new_assignment)
        
        return created_assignments

    @staticmethod
    def get_user_assignments(user):
        direct_assignments = Assignment.objects.filter(
            assignee_type='user',
            assignee_user=user
        ).select_related('checklist_template', 'checklist_item', 'checklist_instance')
        
        group_ids = user.custom_groups.values_list('id', flat=True)
        group_assignments = Assignment.objects.filter(
            assignee_type='group',
            assignee_group_id__in=group_ids
        ).select_related('checklist_template', 'checklist_item', 'checklist_instance')
        
        return {
            'direct': direct_assignments,
            'group': group_assignments,
        }

    @staticmethod
    def notify_assignees(assignment, action='created'):
        if not assignment.auto_notify:
            return []
        
        users = AssignmentService._get_users_from_assignment(assignment, {})
        notified_users = []
        
        for user in users:
            notified_users.append({
                'user': user,
                'action': action,
                'assignment': assignment,
            })
        
        return notified_users

    @staticmethod
    def get_assignment_summary(assignment):
        return {
            'id': assignment.id,
            'type': assignment.assignment_type,
            'assignee_type': assignment.assignee_type,
            'assignee_display': assignment.assignee_display,
            'target_display': assignment.target_display,
            'is_exclusive': assignment.is_exclusive,
            'auto_notify': assignment.auto_notify,
        }
