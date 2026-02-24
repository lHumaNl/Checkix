from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from apps.stats.models import ChecklistUsageStats


class StatsService:
    @staticmethod
    def get_or_create_stats(template, date):
        return ChecklistUsageStats.get_or_create_for_date(template, date)

    @staticmethod
    @transaction.atomic
    def record_instance_created(template, date=None):
        if date is None:
            date = timezone.now().date()

        stats = StatsService.get_or_create_stats(template, date)
        stats.instances_created += 1
        stats.save(update_fields=['instances_created', 'updated_at'])
        return stats

    @staticmethod
    @transaction.atomic
    def record_instance_completed(template, completion_time_seconds=None, completion_percentage=None, date=None):
        if date is None:
            date = timezone.now().date()

        stats = StatsService.get_or_create_stats(template, date)
        stats.instances_completed += 1

        if completion_time_seconds is not None:
            if stats.avg_completion_time_seconds:
                total_time = stats.avg_completion_time_seconds * (stats.instances_completed - 1)
                stats.avg_completion_time_seconds = (total_time + completion_time_seconds) / stats.instances_completed
            else:
                stats.avg_completion_time_seconds = completion_time_seconds

        if completion_percentage is not None:
            if stats.avg_completion_percentage is not None:
                total_percentage = stats.avg_completion_percentage * (stats.instances_completed - 1)
                stats.avg_completion_percentage = (total_percentage + completion_percentage) / stats.instances_completed
            else:
                stats.avg_completion_percentage = completion_percentage

        stats.save()
        return stats

    @staticmethod
    def get_template_stats(template, start_date=None, end_date=None):
        queryset = ChecklistUsageStats.objects.filter(template=template)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset.order_by('-date')

    @staticmethod
    def get_template_summary(template, start_date=None, end_date=None):
        queryset = ChecklistUsageStats.objects.filter(template=template)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        from django.db.models import Sum, Avg

        aggregates = queryset.aggregate(
            total_created=Sum('instances_created'),
            total_completed=Sum('instances_completed'),
            avg_time=Avg('avg_completion_time_seconds'),
            avg_percentage=Avg('avg_completion_percentage'),
        )

        daily_stats = list(
            queryset.values(
                'date', 'instances_created', 'instances_completed',
                'avg_completion_time_seconds', 'avg_completion_percentage'
            ).order_by('-date')[:30]
        )

        return {
            'total_instances_created': aggregates['total_created'] or 0,
            'total_instances_completed': aggregates['total_completed'] or 0,
            'avg_completion_time_seconds': aggregates['avg_time'],
            'avg_completion_percentage': aggregates['avg_percentage'],
            'daily_stats': daily_stats,
        }

    @staticmethod
    def get_overall_stats(start_date=None, end_date=None):
        queryset = ChecklistUsageStats.objects.all()

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        from django.db.models import Sum, Avg, Count

        aggregates = queryset.aggregate(
            total_templates=Count('template', distinct=True),
            total_created=Sum('instances_created'),
            total_completed=Sum('instances_completed'),
        )

        total_created = aggregates['total_created'] or 0
        total_completed = aggregates['total_completed'] or 0
        completion_rate = (total_completed / total_created * 100) if total_created > 0 else 0

        top_templates = list(
            queryset.values(
                'template__id', 'template__name'
            ).annotate(
                total_created=Sum('instances_created'),
                total_completed=Sum('instances_completed'),
            ).order_by('-total_created')[:10]
        )

        recent_activity = list(
            queryset.filter(instances_created__gt=0)
            .order_by('-date')
            .values('date', 'template__name', 'instances_created', 'instances_completed')[:10]
        )

        return {
            'total_templates': aggregates['total_templates'] or 0,
            'total_instances_created': total_created,
            'total_instances_completed': total_completed,
            'avg_completion_rate': round(completion_rate, 2),
            'top_templates': top_templates,
            'recent_activity': recent_activity,
        }

    @staticmethod
    def get_stats_by_category(start_date=None, end_date=None):
        from apps.checklists.models import ChecklistTemplate
        from django.db.models import Sum

        templates_with_stats = ChecklistTemplate.objects.filter(
            community_template__isnull=False
        ).values(
            'community_template__category'
        ).annotate(
            total_instances=Sum('usage_stats__instances_created'),
            total_completed=Sum('usage_stats__instances_completed'),
        ).order_by('-total_instances')

        return list(templates_with_stats)

    @staticmethod
    @transaction.atomic
    def recalculate_stats_for_date(template, date):
        from apps.checklist_instances.models import ChecklistInstance
        from django.db.models import Avg

        instances = ChecklistInstance.objects.filter(
            template=template,
            created_at__date=date,
        )

        created_count = instances.count()
        completed_instances = instances.filter(status='completed')

        completed_count = completed_instances.count()

        completion_times = []
        completion_percentages = []

        for instance in completed_instances:
            if instance.completed_at and instance.created_at:
                delta = instance.completed_at - instance.created_at
                completion_times.append(delta.total_seconds())

            if hasattr(instance, 'completion_percentage'):
                completion_percentages.append(instance.completion_percentage)

        avg_time = sum(completion_times) / len(completion_times) if completion_times else None
        avg_percentage = sum(completion_percentages) / len(completion_percentages) if completion_percentages else None

        stats, _ = ChecklistUsageStats.objects.update_or_create(
            template=template,
            date=date,
            defaults={
                'instances_created': created_count,
                'instances_completed': completed_count,
                'avg_completion_time_seconds': int(avg_time) if avg_time else None,
                'avg_completion_percentage': avg_percentage,
            }
        )

        return stats

    @staticmethod
    @transaction.atomic
    def aggregate_daily_stats(days_back=7):
        today = timezone.now().date()
        start_date = today - timedelta(days=days_back - 1)

        from apps.checklists.models import ChecklistTemplate
        from apps.checklist_instances.models import ChecklistInstance
        from django.db.models import Count, Q, Avg

        # Find templates that have instances in the date range
        template_ids = ChecklistInstance.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=today,
        ).values_list('template_id', flat=True).distinct()

        templates = ChecklistTemplate.all_objects.filter(id__in=template_ids)

        for template in templates:
            for i in range(days_back):
                date = today - timedelta(days=i)
                StatsService.recalculate_stats_for_date(template, date)
