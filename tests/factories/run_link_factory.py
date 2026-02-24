import factory
from factory.django import DjangoModelFactory

from apps.run_links.models import RunLink
from tests.factories.user_factory import UserFactory
from tests.factories.checklist_factory import ChecklistTemplateFactory


class RunLinkFactory(DjangoModelFactory):
    class Meta:
        model = RunLink

    checklist_template = factory.SubFactory(ChecklistTemplateFactory)
    name = factory.Sequence(lambda n: f"Run Link {n}")
    access_type = 'public'
    preset_values = factory.LazyFunction(lambda: {})
    created_by = factory.SubFactory(UserFactory)
