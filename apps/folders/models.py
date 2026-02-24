from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from mptt.models import MPTTModel, TreeForeignKey

from apps.core.models import TimestampedModel


class Folder(MPTTModel, TimestampedModel):
    name = models.CharField(max_length=200)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='folders'
    )
    parent = TreeForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    icon = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'folders'

    class MPTTMeta:
        order_insertion_by = ['name']

    def __str__(self):
        return self.name

    def clean(self):
        if self.parent_id and self.pk:
            if self.parent_id == self.pk:
                raise ValidationError('A folder cannot be its own parent.')
            # mptt provides efficient is_descendant_of after tree is built;
            # for pre-save validation use the Python traversal as fallback
            parent = self.parent
            while parent:
                if parent.pk == self.pk:
                    raise ValidationError('Circular folder reference detected.')
                parent = parent.parent

    def get_ancestors(self):
        return list(super().get_ancestors())

    def get_descendants(self):
        return list(super().get_descendants())

    def get_root(self):
        return super().get_root()

    @property
    def is_root(self):
        return self.parent is None

    @property
    def depth(self):
        return self.level
