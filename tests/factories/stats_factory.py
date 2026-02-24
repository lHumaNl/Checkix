import factory
from factory.django import DjangoModelFactory

from apps.stats.models import ChecklistUsageStats
from tests.factories.checklist_factory import ChecklistTemplateFactory


class ChecklistUsageStatsFactory(DjangoModelFactory):
    class Meta:
        model = ChecklistUsageStats

    template = factory.SubFactory(ChecklistTemplateFactory)
    date = factory.Faker("date_this_year")
    instances_created = 5
    instances_completed = 3
    avg_completion_time_seconds = 600
    avg_completion_percentage = 85.0
