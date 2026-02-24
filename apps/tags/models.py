from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel


class Tag(TimestampedModel):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#3498db')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tags'
    )
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'tags'
        ordering = ['name']
        unique_together = ['name', 'user']

    def __str__(self):
        return self.name
