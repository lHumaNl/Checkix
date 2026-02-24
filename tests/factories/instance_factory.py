import factory
from factory.django import DjangoModelFactory

from apps.checklist_instances.models import (
    ChecklistInstance,
    ChecklistItemInstance,
)
from tests.factories.user_factory import UserFactory
from tests.factories.checklist_factory import (
    ChecklistTemplateFactory,
    ChecklistVersionFactory,
)


class ChecklistInstanceFactory(DjangoModelFactory):
    class Meta:
        model = ChecklistInstance

    template = factory.SubFactory(ChecklistTemplateFactory)
    version = factory.SubFactory(ChecklistVersionFactory)
    name = factory.Sequence(lambda n: f"Instance {n}")
    user = factory.SubFactory(UserFactory)
    status = "draft"
    progress_percentage = 0


class ChecklistItemInstanceFactory(DjangoModelFactory):
    class Meta:
        model = ChecklistItemInstance

    instance = factory.SubFactory(ChecklistInstanceFactory)
    item = None
    title = factory.Sequence(lambda n: f"Item Instance {n}")
    order = factory.Sequence(lambda n: n)
    is_completed = False
