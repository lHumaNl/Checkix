import csv
from datetime import timedelta, datetime

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiResponse

from apps.stats.models import ChecklistUsageStats
from apps.stats.serializers import (
    ChecklistUsageStatsSerializer,
    ChecklistUsageStatsListSerializer,
    ChecklistUsageStatsMinimalSerializer,
    DateRangeSerializer,
    StatsSummarySerializer,
    TemplateStatsSummarySerializer,
    OverallStatsSerializer,
)
from apps.stats.filters import ChecklistUsageStatsFilter
from apps.stats.services import StatsService


@extend_schema_view(
    list=extend_schema(
        summary='List usage statistics',
        description='Retrieve a list of checklist usage statistics',
        tags=['Statistics']
    ),
    retrieve=extend_schema(
        summary='Retrieve usage statistics',
        description='Get details of specific usage statistics',
        tags=['Statistics']
    ),
)
class ChecklistUsageStatsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChecklistUsageStatsSerializer
    filterset_class = ChecklistUsageStatsFilter
    ordering_fields = ['date', 'instances_created', 'instances_completed', 'avg_completion_time_seconds']
    ordering = ['-date']

    def get_queryset(self):
        return ChecklistUsageStats.objects.filter(
            template__user=self.request.user
        ).select_related('template')

    def get_serializer_class(self):
        if self.action == 'list':
            return ChecklistUsageStatsListSerializer
        return ChecklistUsageStatsSerializer

    @extend_schema(
        summary='Get stats by template',
        description='Get usage statistics for a specific template',
        responses={200: StatsSummarySerializer()},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def by_template(self, request):
        template_id = request.query_params.get('template_id')

        if not template_id:
            return Response(
                {'error': 'template_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.checklists.models import ChecklistTemplate

        try:
            template = ChecklistTemplate.objects.get(id=template_id)
        except ChecklistTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        summary = StatsService.get_template_summary(
            template=template,
            start_date=start_date,
            end_date=end_date,
        )

        serializer = StatsSummarySerializer(summary)
        return Response(serializer.data)

    @extend_schema(
        summary='Get overall statistics',
        description='Get overall usage statistics across all templates',
        responses={200: OverallStatsSerializer()},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def overall(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        stats = StatsService.get_overall_stats(
            start_date=start_date,
            end_date=end_date,
        )

        serializer = OverallStatsSerializer(stats)
        return Response(serializer.data)

    @extend_schema(
        summary='Get stats by date range',
        description='Get usage statistics for a date range',
        parameters=[
            OpenApiParameter('start_date', str, description='Start date (YYYY-MM-DD)', required=True),
            OpenApiParameter('end_date', str, description='End date (YYYY-MM-DD)', required=True),
        ],
        responses={200: ChecklistUsageStatsListSerializer(many=True)},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def by_date_range(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stats = ChecklistUsageStats.objects.filter(
            date__gte=start,
            date__lte=end,
        ).select_related('template').order_by('-date')

        output_serializer = ChecklistUsageStatsListSerializer(stats, many=True)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Get stats by category',
        description='Get usage statistics grouped by community template category',
        responses={200: OpenApiResponse(description='Stats by category')},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        stats = StatsService.get_stats_by_category(
            start_date=start_date,
            end_date=end_date,
        )

        return Response(stats)

    @extend_schema(
        summary='Recalculate stats',
        description='Recalculate statistics for a specific date (admin only)',
        request={'type': 'object', 'properties': {'template_id': {'type': 'string'}, 'date': {'type': 'string', 'format': 'date'}}},
        responses={200: ChecklistUsageStatsSerializer()},
        tags=['Statistics']
    )
    @action(detail=False, methods=['post'])
    def recalculate(self, request):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        template_id = request.data.get('template_id')
        date = request.data.get('date')

        if not template_id or not date:
            return Response(
                {'error': 'template_id and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.checklists.models import ChecklistTemplate

        try:
            template = ChecklistTemplate.objects.get(id=template_id)
        except ChecklistTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        stats = StatsService.recalculate_stats_for_date(template, date)
        serializer = self.get_serializer(stats)
        return Response(serializer.data)

    @extend_schema(
        summary='Aggregate daily stats',
        description='Aggregate and recalculate stats for the past N days (admin only)',
        request={'type': 'object', 'properties': {'days_back': {'type': 'integer', 'default': 7}}},
        responses={200: OpenApiResponse(description='Stats aggregated')},
        tags=['Statistics']
    )
    @action(detail=False, methods=['post'])
    def aggregate(self, request):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        days_back = request.data.get('days_back', 7)
        StatsService.aggregate_daily_stats(days_back=days_back)

        return Response({'message': f'Stats aggregated for the past {days_back} days'})

    @extend_schema(
        summary='Get recent stats',
        description='Get usage statistics for the past N days',
        responses={200: ChecklistUsageStatsMinimalSerializer(many=True)},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def recent(self, request):
        try:
            days = int(request.query_params.get('days', 7))
        except ValueError:
            return Response(
                {'error': 'days must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        from django.utils import timezone
        from datetime import timedelta

        start_date = (timezone.now() - timedelta(days=days)).date()

        stats = ChecklistUsageStats.objects.filter(
            date__gte=start_date,
        ).select_related('template').order_by('-date')

        serializer = ChecklistUsageStatsMinimalSerializer(stats[:50], many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get top templates',
        description='Get templates with the most instance creations',
        parameters=[
            OpenApiParameter('start_date', str, description='Start date (YYYY-MM-DD)'),
            OpenApiParameter('end_date', str, description='End date (YYYY-MM-DD)'),
        ],
        responses={200: TemplateStatsSummarySerializer(many=True)},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def top_templates(self, request):
        from django.db.models import Sum

        serializer = DateRangeSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']

        top_templates = ChecklistUsageStats.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
        ).values(
            'template__id', 'template__name'
        ).annotate(
            total_instances=Sum('instances_created'),
            total_completed=Sum('instances_completed'),
        ).order_by('-total_instances')[:10]

        result = []
        for item in top_templates:
            result.append({
                'template_id': item['template__id'],
                'template_name': item['template__name'],
                'total_instances': item['total_instances'] or 0,
                'completed_instances': item['total_completed'] or 0,
                'completion_rate': (
                    item['total_completed'] / item['total_instances'] * 100
                    if item['total_instances'] else 0
                ),
            })

        return Response(result)

    @extend_schema(
        summary='Export stats as CSV',
        description='Export usage statistics for a date range as CSV file',
        responses={200: OpenApiResponse(description='CSV file download')},
        tags=['Statistics']
    )
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stats = ChecklistUsageStats.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
        ).select_related('template').order_by('-date')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="checkix_stats_{start_date}_{end_date}.csv"'
        )

        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Template', 'Instances Created', 'Instances Completed',
            'Avg Completion Time (min)', 'Avg Completion %',
        ])

        for stat in stats:
            avg_time_min = (
                round(stat.avg_completion_time_seconds / 60, 1)
                if stat.avg_completion_time_seconds else ''
            )
            avg_pct = (
                round(stat.avg_completion_percentage, 1)
                if stat.avg_completion_percentage is not None else ''
            )
            writer.writerow([
                stat.date,
                stat.template.name,
                stat.instances_created,
                stat.instances_completed,
                avg_time_min,
                avg_pct,
            ])

        return response


@extend_schema(
    summary='Get dashboard statistics',
    description='Get aggregated statistics for the dashboard',
    responses={200: OpenApiResponse(description='Dashboard statistics')},
    tags=['Dashboard']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)

    from apps.checklists.models import ChecklistTemplate
    from apps.checklist_instances.models import ChecklistInstance
    from apps.todo.models import TodoItem, TodoList
    from apps.calendar.models import CalendarEvent

    total_checklists = ChecklistTemplate.objects.filter(user=user).count()
    completed_checklists = ChecklistInstance.objects.filter(
        user=user, status='completed'
    ).count()

    total_todos = TodoItem.objects.filter(todo_list__user=user).count()
    completed_todos = TodoItem.objects.filter(
        todo_list__user=user, status='completed'
    ).count()

    upcoming_events = CalendarEvent.objects.filter(
        user=user,
        start_datetime__gte=timezone.now(),
        is_completed=False
    ).count()

    completed_this_week = ChecklistInstance.objects.filter(
        user=user,
        status='completed',
        completed_at__date__gte=week_ago
    ).count()
    completed_last_week = ChecklistInstance.objects.filter(
        user=user,
        status='completed',
        completed_at__date__gte=week_ago - timedelta(days=7),
        completed_at__date__lt=week_ago
    ).count()

    if completed_last_week > 0:
        weekly_change = int(((completed_this_week - completed_last_week) / completed_last_week) * 100)
    elif completed_this_week > 0:
        weekly_change = 100
    else:
        weekly_change = 0

    dates_with_activity = ChecklistInstance.objects.filter(
        user=user, status='completed'
    ).dates('completed_at', 'day').order_by('-completed_at')[:30]

    streak_days = 0
    if dates_with_activity:
        check_date = today
        for activity_date in dates_with_activity:
            if activity_date == check_date or activity_date == check_date - timedelta(days=1):
                streak_days += 1
                check_date = activity_date - timedelta(days=1)
            else:
                break

    completion_rate = int((completed_checklists / total_checklists * 100)) if total_checklists > 0 else 0

    return Response({
        'total_checklists': total_checklists,
        'completed_checklists': completed_checklists,
        'total_todos': total_todos,
        'completed_todos': completed_todos,
        'upcoming_events': upcoming_events,
        'streak_days': streak_days,
        'completion_rate': completion_rate,
        'weekly_change': weekly_change,
    })


@extend_schema(
    summary='Get completion chart data',
    description='Get completion data for the last 30 days for chart visualization',
    tags=['Dashboard']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_chart_completion(request):
    from apps.checklist_instances.models import ChecklistInstance
    from django.db.models.functions import TruncDate

    user = request.user
    today = timezone.now().date()
    start_date = today - timedelta(days=30)

    completions = ChecklistInstance.objects.filter(
        user=user,
        status='completed',
        completed_at__date__gte=start_date,
    ).annotate(
        completion_date=TruncDate('completed_at')
    ).values('completion_date').annotate(
        count=Count('id')
    ).order_by('completion_date')

    counts_by_date = {item['completion_date']: item['count'] for item in completions if item['completion_date']}

    data = []
    current = start_date
    while current <= today:
        data.append({
            'date': current.isoformat(),
            'value': counts_by_date.get(current, 0),
            'label': current.strftime('%b %d'),
        })
        current += timedelta(days=1)

    return Response(data)


@extend_schema(
    summary='Get activity heatmap data',
    description='Get activity data for the last 365 days for heatmap visualization',
    tags=['Dashboard']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_heatmap(request):
    user = request.user
    today = timezone.now().date()
    start_date = today - timedelta(days=365)

    from apps.checklist_instances.models import ChecklistInstance
    from django.db.models.functions import TruncDate

    activities = ChecklistInstance.objects.filter(
        user=user,
        status='completed',
        completed_at__date__gte=start_date,
    ).annotate(
        activity_date=TruncDate('completed_at')
    ).values('activity_date').annotate(
        count=Count('id')
    ).order_by('activity_date')

    data = [{'date': item['activity_date'].isoformat(), 'count': item['count']} for item in activities if item['activity_date']]

    return Response(data)


@extend_schema(
    summary='Get activity feed',
    description='Get recent activity feed for the dashboard',
    parameters=[
        OpenApiParameter('page', int, description='Page number'),
        OpenApiParameter('limit', int, description='Items per page'),
    ],
    tags=['Dashboard']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_activities(request):
    from apps.checklist_instances.models import ChecklistInstance
    from apps.todo.models import TodoItem
    from apps.calendar.models import CalendarEvent

    user = request.user
    limit = min(int(request.query_params.get('limit', 20)), 100)
    offset = (int(request.query_params.get('page', 1)) - 1) * limit

    activities = []

    checklist_instances = ChecklistInstance.objects.filter(
        user=user
    ).select_related('template').order_by('-created_at')[:limit]

    for instance in checklist_instances:
        action = 'created'
        if instance.status == 'completed':
            action = 'completed'
        elif instance.status == 'in_progress':
            action = 'updated'

        ts = instance.completed_at or instance.created_at
        activities.append({
            'id': f'ci-{instance.id}',
            'type': 'checklist',
            'action': action,
            'title': instance.template.name if instance.template else 'Checklist',
            'description': f'Status: {instance.get_status_display()}',
            'timestamp': ts.isoformat(),
        })

    todos = TodoItem.objects.filter(
        todo_list__user=user
    ).select_related('todo_list').order_by('-updated_at')[:limit]

    for todo in todos:
        action = 'completed' if todo.status == 'completed' else 'updated'
        ts = todo.completed_at or todo.updated_at
        activities.append({
            'id': f'todo-{todo.id}',
            'type': 'todo',
            'action': action,
            'title': todo.title,
            'description': todo.todo_list.name if todo.todo_list else None,
            'timestamp': ts.isoformat(),
        })

    events = CalendarEvent.objects.filter(
        user=user
    ).order_by('-created_at')[:limit]

    for event in events:
        activities.append({
            'id': f'event-{event.id}',
            'type': 'event',
            'action': 'created',
            'title': event.title,
            'description': event.description,
            'timestamp': event.created_at.isoformat(),
        })

    activities.sort(key=lambda x: x['timestamp'], reverse=True)

    total = len(activities)
    has_more = offset + limit < total
    paginated = activities[offset:offset + limit]

    return Response({
        'count': total,
        'next': f'?page={int(request.query_params.get("page", 1)) + 1}&limit={limit}' if has_more else None,
        'previous': f'?page={int(request.query_params.get("page", 1)) - 1}&limit={limit}' if int(request.query_params.get('page', 1)) > 1 else None,
        'results': paginated,
    })
