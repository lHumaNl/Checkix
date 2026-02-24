import factory
from factory.django import DjangoModelFactory

from apps.notifications.models import (
    DynamicDueDateRule,
    NotificationRule,
    NotificationSequence,
    NotificationLog,
)
from tests.factories.user_factory import UserFactory, GroupFactory
from tests.factories.checklist_factory import ChecklistTemplateFactory, ChecklistItemFactory
from tests.factories.instance_factory import ChecklistInstanceFactory


class DynamicDueDateRuleFactory(DjangoModelFactory):
    class Meta:
        model = DynamicDueDateRule

    checklist_template = factory.SubFactory(ChecklistTemplateFactory)
    created_by = factory.SubFactory(UserFactory)
    trigger_type = 'checklist_start'
    offset_minutes = 60
    business_days_only = False


class NotificationRuleFactory(DjangoModelFactory):
    class Meta:
        model = NotificationRule

    checklist_template = factory.SubFactory(ChecklistTemplateFactory)
    created_by = factory.SubFactory(UserFactory)
    event_type = 'task_due_in'
    is_active = True


class NotificationSequenceFactory(DjangoModelFactory):
    class Meta:
        model = NotificationSequence

    notification_rule = factory.SubFactory(NotificationRuleFactory)
    sequence_order = factory.Sequence(lambda n: n)
    trigger_offset_minutes = 30
    recipient_type = 'assignee'


class NotificationLogFactory(DjangoModelFactory):
    class Meta:
        model = NotificationLog

    notification_sequence = factory.SubFactory(NotificationSequenceFactory)
    checklist_instance = factory.SubFactory(ChecklistInstanceFactory)
    recipient_email = factory.LazyAttribute(lambda obj: f"recipient{obj.notification_sequence.id}@example.com")
    status = 'pending'
