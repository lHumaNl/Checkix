from django.db import models

from apps.core.models import TimestampedModel


class ChecklistUsageStats(TimestampedModel):
    template = models.ForeignKey(
        'checklists.ChecklistTemplate',
        on_delete=models.CASCADE,
        related_name='usage_stats'
    )
    date = models.DateField()
    instances_created = models.PositiveIntegerField(default=0)
    instances_completed = models.PositiveIntegerField(default=0)
    avg_completion_time_seconds = models.PositiveIntegerField(null=True, blank=True)
    avg_completion_percentage = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'checklist_usage_stats'
        unique_together = ['template', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['template', 'date']),
        ]

    def __str__(self):
        return f"{self.template} - {self.date}"

    @classmethod
    def get_or_create_for_date(cls, template, date):
        obj, created = cls.objects.get_or_create(
            template=template,
            date=date,
            defaults={
                'instances_created': 0,
                'instances_completed': 0,
            }
        )
        return obj

    @property
    def avg_completion_time_minutes(self):
        if self.avg_completion_time_seconds:
            return round(self.avg_completion_time_seconds / 60, 2)
        return None

    @property
    def avg_completion_time_hours(self):
        if self.avg_completion_time_seconds:
            return round(self.avg_completion_time_seconds / 3600, 2)
        return None
