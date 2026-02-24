import pytest
from datetime import date, timedelta
from django.utils import timezone

from apps.stats.services import StatsService
from apps.stats.models import ChecklistUsageStats
from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    ChecklistInstanceFactory,
    ChecklistVersionFactory,
    ChecklistUsageStatsFactory,
)


@pytest.mark.django_db
class TestRecordInstanceCreated:
    def test_increments_counter(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        stats = StatsService.record_instance_created(template, today)
        assert stats.instances_created == 1

        stats = StatsService.record_instance_created(template, today)
        assert stats.instances_created == 2

    def test_creates_stats_if_not_exists(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        assert not ChecklistUsageStats.objects.filter(template=template, date=today).exists()
        StatsService.record_instance_created(template, today)
        assert ChecklistUsageStats.objects.filter(template=template, date=today).exists()


@pytest.mark.django_db
class TestRecordInstanceCompleted:
    def test_increments_completed_counter(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        StatsService.record_instance_created(template, today)
        stats = StatsService.record_instance_completed(template, date=today)
        assert stats.instances_completed == 1

    def test_calculates_avg_completion_time(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        stats = StatsService.record_instance_completed(
            template, completion_time_seconds=600, date=today
        )
        assert stats.avg_completion_time_seconds == 600

    def test_calculates_running_avg_completion_time(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        StatsService.record_instance_completed(
            template, completion_time_seconds=600, date=today
        )
        stats = StatsService.record_instance_completed(
            template, completion_time_seconds=400, date=today
        )
        assert stats.avg_completion_time_seconds == 500


@pytest.mark.django_db
class TestGetTemplateSummary:
    def test_returns_aggregated_data(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        ChecklistUsageStatsFactory(
            template=template,
            date=today,
            instances_created=10,
            instances_completed=8,
        )
        ChecklistUsageStatsFactory(
            template=template,
            date=today - timedelta(days=1),
            instances_created=5,
            instances_completed=3,
        )

        summary = StatsService.get_template_summary(template)
        assert summary["total_instances_created"] == 15
        assert summary["total_instances_completed"] == 11


@pytest.mark.django_db
class TestGetOverallStats:
    def test_returns_overall_aggregation(self):
        user = UserFactory()
        t1 = ChecklistTemplateFactory(user=user)
        t2 = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        ChecklistUsageStatsFactory(template=t1, date=today, instances_created=10, instances_completed=8)
        ChecklistUsageStatsFactory(template=t2, date=today, instances_created=5, instances_completed=5)

        stats = StatsService.get_overall_stats()
        assert stats["total_templates"] == 2
        assert stats["total_instances_created"] == 15
        assert stats["total_instances_completed"] == 13

    def test_filters_by_date_range(self):
        user = UserFactory()
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()

        ChecklistUsageStatsFactory(template=template, date=today, instances_created=10)
        ChecklistUsageStatsFactory(
            template=template,
            date=today - timedelta(days=30),
            instances_created=5,
        )

        stats = StatsService.get_overall_stats(
            start_date=str(today - timedelta(days=1)),
            end_date=str(today),
        )
        assert stats["total_instances_created"] == 10
