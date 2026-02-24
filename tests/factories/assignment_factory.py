import factory
from factory.django import DjangoModelFactory

from apps.assignments.models import Assignment
from tests.factories.user_factory import UserFactory, GroupFactory
from tests.factories.checklist_factory import ChecklistTemplateFactory, ChecklistItemFactory
from tests.factories.instance_factory import ChecklistInstanceFactory


class AssignmentFactory(DjangoModelFactory):
    class Meta:
        model = Assignment

    user = factory.SubFactory(UserFactory)
    assignment_type = 'template'
    checklist_template = factory.SubFactory(ChecklistTemplateFactory)
    assignee_type = 'user'
    assignee_user = factory.SubFactory(UserFactory)
    is_exclusive = False
    auto_notify = True

    @classmethod
    def create_template_assignment(cls, template=None, user=None, **kwargs):
        return cls.create(
            assignment_type='template',
            checklist_template=template or ChecklistTemplateFactory(),
            assignee_type='user',
            assignee_user=user or UserFactory(),
            **kwargs
        )

    @classmethod
    def create_item_assignment(cls, item=None, user=None, **kwargs):
        return cls.create(
            assignment_type='item',
            checklist_item=item or ChecklistItemFactory(),
            assignee_type='user',
            assignee_user=user or UserFactory(),
            **kwargs
        )

    @classmethod
    def create_instance_assignment(cls, instance=None, user=None, **kwargs):
        return cls.create(
            assignment_type='runtime',
            checklist_instance=instance or ChecklistInstanceFactory(),
            assignee_type='user',
            assignee_user=user or UserFactory(),
            **kwargs
        )

    @classmethod
    def create_group_assignment(cls, template=None, group=None, **kwargs):
        return cls.create(
            assignment_type='template',
            checklist_template=template or ChecklistTemplateFactory(),
            assignee_type='group',
            assignee_group=group or GroupFactory(),
            **kwargs
        )
