import pytest
from django.utils import timezone

from apps.core.models import TimestampedModel, SoftDeleteModel, TimestampedSoftDeleteModel


class TestTimestampedModel:
    @pytest.mark.django_db(transaction=True)
    def test_created_at_set_on_creation(self):
        from django.db import models

        class ConcreteTimestamped(TimestampedModel):
            class Meta:
                app_label = "tests"
                abstract = False

        from django.db import connection
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(ConcreteTimestamped)

        obj = ConcreteTimestamped.objects.create()
        assert obj.created_at is not None
        assert obj.updated_at is not None

        ConcreteTimestamped._meta.db_table = None


class TestSoftDeleteModel:
    @pytest.mark.django_db(transaction=True)
    def test_soft_delete_sets_flags(self):
        from django.db import models

        class ConcreteSoftDelete(SoftDeleteModel):
            class Meta:
                app_label = "tests"
                abstract = False

        from django.db import connection
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(ConcreteSoftDelete)

        obj = ConcreteSoftDelete.objects.create()
        assert obj.is_deleted is False
        assert obj.deleted_at is None

        obj.soft_delete()
        assert obj.is_deleted is True
        assert obj.deleted_at is not None

    @pytest.mark.django_db(transaction=True)
    def test_restore_clears_flags(self):
        from django.db import models

        class ConcreteSoftDelete2(SoftDeleteModel):
            class Meta:
                app_label = "tests"
                abstract = False

        from django.db import connection
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(ConcreteSoftDelete2)

        obj = ConcreteSoftDelete2.objects.create()
        obj.soft_delete()
        assert obj.is_deleted is True

        obj.restore()
        assert obj.is_deleted is False
        assert obj.deleted_at is None


class TestTimestampedSoftDeleteModel:
    @pytest.mark.django_db(transaction=True)
    def test_has_both_timestamps_and_soft_delete(self):
        from django.db import models

        class ConcreteFull(TimestampedSoftDeleteModel):
            name = models.CharField(max_length=100, default="test")
            
            class Meta:
                app_label = "tests"
                abstract = False

        from django.db import connection
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(ConcreteFull)

        obj = ConcreteFull.objects.create()
        assert hasattr(obj, "created_at")
        assert hasattr(obj, "updated_at")
        assert hasattr(obj, "is_deleted")
        assert hasattr(obj, "deleted_at")

        obj.soft_delete()
        assert obj.is_deleted is True

        obj.restore()
        assert obj.is_deleted is False
