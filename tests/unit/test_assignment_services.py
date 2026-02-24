import pytest
from django.contrib.auth.models import User

from apps.assignments.services import AssignmentService
from apps.assignments.models import Assignment
from tests.factories import (
    UserFactory,
    GroupFactory,
    GroupMembershipFactory,
    ChecklistTemplateFactory,
    ChecklistItemFactory,
    ChecklistInstanceFactory,
)


@pytest.mark.django_db
class TestAssignmentService:
    def test_get_template_assignments(self):
        template = ChecklistTemplateFactory()
        assignment = AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=UserFactory(),
        )
        
        assignments = AssignmentService.get_template_assignments(template)
        assert assignments.count() == 1
        assert assignments.first() == assignment

    def test_get_item_assignments(self):
        item = ChecklistItemFactory()
        assignment = AssignmentService.create_item_assignment(
            item=item,
            assignee_type='user',
            assignee=UserFactory(),
        )
        
        assignments = AssignmentService.get_item_assignments(item)
        assert assignments.count() == 1
        assert assignments.first() == assignment

    def test_get_instance_assignments(self):
        instance = ChecklistInstanceFactory()
        assignment = AssignmentService.create_instance_assignment(
            instance=instance,
            assignee_type='user',
            assignee=UserFactory(),
        )
        
        assignments = AssignmentService.get_instance_assignments(instance)
        assert assignments.count() == 1
        assert assignments.first() == assignment

    def test_resolve_assignees_for_user_type(self):
        user = UserFactory()
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(template)
        assert len(resolved) == 1
        assert resolved[0] == user

    def test_resolve_assignees_for_group_type(self):
        user = UserFactory()
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group)
        
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='group',
            assignee_group=group,
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(template)
        assert len(resolved) == 1
        assert resolved[0] == user

    def test_resolve_assignees_exclusive_takes_precedence(self):
        exclusive_user = UserFactory()
        regular_user = UserFactory()
        template = ChecklistTemplateFactory()
        
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=regular_user,
            is_exclusive=False,
        )
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=exclusive_user,
            is_exclusive=True,
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(template)
        assert len(resolved) == 1
        assert resolved[0] == exclusive_user

    def test_resolve_assignees_parameter_type(self):
        user = UserFactory(username='testuser')
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='parameter',
            assignee_parameter='assigned_user',
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(
            template,
            placeholder_values={'assigned_user': 'testuser'}
        )
        assert len(resolved) == 1
        assert resolved[0] == user

    def test_resolve_assignees_parameter_by_id(self):
        user = UserFactory()
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='parameter',
            assignee_parameter='assigned_user',
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(
            template,
            placeholder_values={'assigned_user': str(user.id)}
        )
        assert len(resolved) == 1
        assert resolved[0] == user

    def test_resolve_assignees_parameter_by_email(self):
        user = UserFactory(email='test@example.com')
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='parameter',
            assignee_parameter='assigned_user',
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(
            template,
            placeholder_values={'assigned_user': 'test@example.com'}
        )
        assert len(resolved) == 1
        assert resolved[0] == user

    def test_resolve_assignees_deduplicates_users(self):
        user = UserFactory()
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group)
        
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
        )
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='group',
            assignee_group=group,
        )
        
        resolved = AssignmentService.resolve_assignees_for_template(template)
        assert len(resolved) == 1
        assert resolved[0] == user

    def test_create_template_assignment(self):
        template = ChecklistTemplateFactory()
        user = UserFactory()
        
        assignment = AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
        )
        
        assert assignment.assignment_type == 'template'
        assert assignment.checklist_template == template
        assert assignment.assignee_user == user
        assert assignment.is_exclusive is False
        assert assignment.auto_notify is True

    def test_create_item_assignment(self):
        item = ChecklistItemFactory()
        user = UserFactory()
        
        assignment = AssignmentService.create_item_assignment(
            item=item,
            assignee_type='user',
            assignee=user,
        )
        
        assert assignment.assignment_type == 'item'
        assert assignment.checklist_item == item
        assert assignment.assignee_user == user

    def test_create_instance_assignment(self):
        instance = ChecklistInstanceFactory()
        user = UserFactory()
        
        assignment = AssignmentService.create_instance_assignment(
            instance=instance,
            assignee_type='user',
            assignee=user,
        )
        
        assert assignment.assignment_type == 'runtime'
        assert assignment.checklist_instance == instance
        assert assignment.assignee_user == user

    def test_copy_template_assignments_to_instance(self):
        user = UserFactory()
        group = GroupFactory()
        template = ChecklistTemplateFactory()
        instance = ChecklistInstanceFactory()
        
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
        )
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='group',
            assignee_group=group,
        )
        
        copied = AssignmentService.copy_template_assignments_to_instance(template, instance)
        assert len(copied) == 2
        
        for assignment in copied:
            assert assignment.assignment_type == 'runtime'
            assert assignment.checklist_instance == instance

    def test_get_user_assignments_direct(self):
        user = UserFactory()
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
        )
        
        result = AssignmentService.get_user_assignments(user)
        assert result['direct'].count() == 1
        assert result['group'].count() == 0

    def test_get_user_assignments_via_group(self):
        user = UserFactory()
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group)
        
        template = ChecklistTemplateFactory()
        AssignmentService.create_template_assignment(
            template=template,
            assignee_type='group',
            assignee_group=group,
        )
        
        result = AssignmentService.get_user_assignments(user)
        assert result['direct'].count() == 0
        assert result['group'].count() == 1

    def test_notify_assignees_when_auto_notify(self):
        user = UserFactory()
        template = ChecklistTemplateFactory()
        assignment = AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
            auto_notify=True,
        )
        
        notified = AssignmentService.notify_assignees(assignment, 'created')
        assert len(notified) == 1
        assert notified[0]['user'] == user
        assert notified[0]['action'] == 'created'

    def test_notify_assignees_when_not_auto_notify(self):
        user = UserFactory()
        template = ChecklistTemplateFactory()
        assignment = AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
            auto_notify=False,
        )
        
        notified = AssignmentService.notify_assignees(assignment, 'created')
        assert len(notified) == 0

    def test_get_assignment_summary(self):
        user = UserFactory()
        template = ChecklistTemplateFactory()
        assignment = AssignmentService.create_template_assignment(
            template=template,
            assignee_type='user',
            assignee=user,
            is_exclusive=True,
        )
        
        summary = AssignmentService.get_assignment_summary(assignment)
        assert summary['id'] == assignment.id
        assert summary['type'] == 'template'
        assert summary['assignee_type'] == 'user'
        assert summary['is_exclusive'] is True
