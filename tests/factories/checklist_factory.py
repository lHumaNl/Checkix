import factory
from factory.django import DjangoModelFactory
from django.contrib.auth.models import User

from apps.checklists.models import (
    ChecklistTemplate,
    ChecklistVersion,
    ChecklistItem,
    Placeholder,
    PlaceholderOption,
)
from apps.folders.models import Folder
from apps.tags.models import Tag
from tests.factories.user_factory import UserFactory as _UserFactory


class FolderFactory(DjangoModelFactory):
    class Meta:
        model = Folder

    name = factory.Sequence(lambda n: f"Folder {n}")
    user = factory.SubFactory(_UserFactory)


class TagFactory(DjangoModelFactory):
    class Meta:
        model = Tag

    name = factory.Sequence(lambda n: f"tag-{n}")
    user = factory.SubFactory(_UserFactory)


class ChecklistTemplateFactory(DjangoModelFactory):
    class Meta:
        model = ChecklistTemplate

    name = factory.Sequence(lambda n: f"Checklist {n}")
    description = factory.Faker("paragraph")
    user = factory.SubFactory(_UserFactory)
    sequential_mode = False
    icon = "clipboard-check"
    is_favorite = False

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for tag in extracted:
                self.tags.add(tag)


class ChecklistVersionFactory(DjangoModelFactory):
    class Meta:
        model = ChecklistVersion

    template = factory.SubFactory(ChecklistTemplateFactory)
    version_number = factory.Sequence(lambda n: n)
    changelog = factory.Faker("sentence")
    is_active = True


class ChecklistItemFactory(DjangoModelFactory):
    class Meta:
        model = ChecklistItem

    version = factory.SubFactory(ChecklistVersionFactory)
    title = factory.Sequence(lambda n: f"Item {n}")
    description = factory.Faker("sentence")
    order = factory.Sequence(lambda n: n)
    is_required = True
    priority = "medium"


class PlaceholderFactory(DjangoModelFactory):
    class Meta:
        model = Placeholder

    name = factory.Sequence(lambda n: f"placeholder_{n}")
    placeholder_type = "text"
    is_required = True
    default_value = ""
    version = factory.SubFactory(ChecklistVersionFactory)


class PlaceholderOptionFactory(DjangoModelFactory):
    class Meta:
        model = PlaceholderOption

    placeholder = factory.SubFactory(PlaceholderFactory)
    value = factory.Sequence(lambda n: f"option_{n}")
    display_text = factory.LazyAttribute(lambda obj: obj.value.replace("_", " ").title())
    order = factory.Sequence(lambda n: n)
