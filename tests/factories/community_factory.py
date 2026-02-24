import factory
from factory.django import DjangoModelFactory

from apps.community.models import CommunityTemplate, TemplateRating
from tests.factories.user_factory import UserFactory
from tests.factories.checklist_factory import ChecklistTemplateFactory


class CommunityTemplateFactory(DjangoModelFactory):
    class Meta:
        model = CommunityTemplate

    checklist_template = factory.SubFactory(ChecklistTemplateFactory)
    author = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Community Template {n}")
    description = factory.Faker("paragraph")
    category = 'general'
    status = 'approved'
    tags = factory.LazyFunction(lambda: ["test"])
    download_count = 0
    rating = 0.0
    rating_count = 0
    is_featured = False


class TemplateRatingFactory(DjangoModelFactory):
    class Meta:
        model = TemplateRating

    community_template = factory.SubFactory(CommunityTemplateFactory)
    user = factory.SubFactory(UserFactory)
    rating = 5
    comment = factory.Faker("sentence")
