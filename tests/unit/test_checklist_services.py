import pytest
from django.contrib.auth.models import User

from apps.checklists.models import ChecklistTemplate, ChecklistVersion, ChecklistItem
from apps.checklists.services import ChecklistService
from apps.checklists.exceptions import ChecklistVersionError
from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    ChecklistVersionFactory,
    ChecklistItemFactory,
)


@pytest.mark.django_db
class TestCreateInitialVersion:
    def test_creates_version_with_number_1(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)

        assert version.version_number == 1
        assert version.is_active is True
        assert version.changelog == "Initial version"

    def test_sets_current_version_on_template(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)

        template.refresh_from_db()
        assert template.current_version == version

    def test_creates_items_if_provided(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        items_data = [
            {"title": "Step 1", "order": 0},
            {"title": "Step 2", "order": 1},
        ]
        version = ChecklistService.create_initial_version(template, items_data=items_data)

        assert version.items.count() == 2
        assert version.items.filter(title="Step 1").exists()


@pytest.mark.django_db
class TestCreateVersion:
    def test_increments_version_number(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        v1 = ChecklistService.create_initial_version(template)
        v2 = ChecklistService.create_version(template, changelog="Update")

        assert v2.version_number == 2

    def test_new_version_not_active_by_default(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(template)
        v2 = ChecklistService.create_version(template, changelog="Update")

        assert v2.is_active is False

    def test_creates_items_from_data(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(template)
        items_data = [{"title": "New item"}]
        v2 = ChecklistService.create_version(template, items_data=items_data)

        assert v2.items.count() == 1
        assert v2.items.first().title == "New item"


@pytest.mark.django_db
class TestDuplicateTemplate:
    def test_creates_copy_with_new_name(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(template)

        copy = ChecklistService.duplicate_template(template, "Copy")

        assert copy.name == "Copy"
        assert copy.user == user
        assert copy.id != template.id

    def test_copies_tags(self):
        from tests.factories import TagFactory

        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        tag = TagFactory(user=user)
        template.tags.add(tag)
        ChecklistService.create_initial_version(template)

        copy = ChecklistService.duplicate_template(template, "Copy")
        assert tag in copy.tags.all()

    def test_copies_items_from_current_version(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        items_data = [
            {"title": "Step 1"},
            {"title": "Step 2"},
        ]
        ChecklistService.create_initial_version(template, items_data=items_data)

        copy = ChecklistService.duplicate_template(template, "Copy")
        assert copy.current_version is not None
        assert copy.current_version.items.count() == 2

    def test_is_favorite_reset_to_false(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user, is_favorite=True)
        ChecklistService.create_initial_version(template)

        copy = ChecklistService.duplicate_template(template, "Copy")
        assert copy.is_favorite is False


@pytest.mark.django_db
class TestDeleteVersion:
    def test_cannot_delete_active_version(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)

        with pytest.raises(ChecklistVersionError):
            ChecklistService.delete_version(version)

    def test_cannot_delete_only_version(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)
        version.is_active = False
        version.save()

        with pytest.raises(ChecklistVersionError):
            ChecklistService.delete_version(version)

    def test_can_delete_inactive_non_last_version(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        ChecklistService.create_initial_version(template)
        v2 = ChecklistService.create_version(template)

        ChecklistService.delete_version(v2)
        assert not ChecklistVersion.objects.filter(id=v2.id).exists()


@pytest.mark.django_db
class TestMoveItemToParent:
    def test_moves_item_to_new_parent(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)

        parent = ChecklistItemFactory(version=version, title="Parent")
        child = ChecklistItemFactory(version=version, title="Child")

        result = ChecklistService.move_item_to_parent(child, parent)
        assert result.parent == parent

    def test_cannot_move_to_descendant(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)

        parent = ChecklistItemFactory(version=version, title="Parent")
        child = ChecklistItemFactory(version=version, title="Child", parent=parent)

        with pytest.raises(ChecklistVersionError):
            ChecklistService.move_item_to_parent(parent, child)

    def test_cannot_move_to_self(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        version = ChecklistService.create_initial_version(template)

        item = ChecklistItemFactory(version=version, title="Item")

        with pytest.raises(ChecklistVersionError):
            ChecklistService.move_item_to_parent(item, item)
