from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from apps.calendar.models import CalendarEvent
from apps.calendar.serializers import (
    CalendarEventSerializer,
    CalendarEventCreateSerializer,
    CalendarEventUpdateSerializer,
    CalendarEventMinimalSerializer,
    CalendarEventRescheduleSerializer,
    CalendarEventCompleteSerializer,
    DateRangeSerializer,
)
from apps.calendar.filters import CalendarEventFilter
from apps.calendar.services import CalendarEventService, RecurrenceService


@extend_schema_view(
    list=extend_schema(
        summary='List all calendar events',
        description='Retrieve a list of all calendar events for the authenticated user',
        tags=['Calendar']
    ),
    retrieve=extend_schema(
        summary='Retrieve a calendar event',
        description='Get details of a specific calendar event',
        tags=['Calendar']
    ),
    create=extend_schema(
        summary='Create a calendar event',
        description='Create a new calendar event',
        tags=['Calendar']
    ),
    update=extend_schema(
        summary='Update a calendar event',
        description='Update an existing calendar event',
        tags=['Calendar']
    ),
    partial_update=extend_schema(
        summary='Partially update a calendar event',
        description='Partially update an existing calendar event',
        tags=['Calendar']
    ),
    destroy=extend_schema(
        summary='Delete a calendar event',
        description='Delete a calendar event',
        tags=['Calendar']
    ),
)
class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    filterset_class = CalendarEventFilter
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_datetime', 'end_datetime', 'created_at', 'updated_at', 'title']
    ordering = ['start_datetime']

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user).select_related(
            'checklist_template', 'todo_list'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CalendarEventCreateSerializer
        if self.action in ['update', 'partial_update']:
            return CalendarEventUpdateSerializer
        if self.action == 'list':
            return CalendarEventMinimalSerializer
        return CalendarEventSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary='Reschedule a calendar event',
        description='Change the start and/or end datetime of an event',
        request=CalendarEventRescheduleSerializer,
        responses={200: CalendarEventSerializer},
        tags=['Calendar']
    )
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        event = self.get_object()
        serializer = CalendarEventRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        event.reschedule(
            new_start_datetime=serializer.validated_data['start_datetime'],
            new_end_datetime=serializer.validated_data.get('end_datetime')
        )
        
        output_serializer = CalendarEventSerializer(event)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Mark event as completed',
        description='Mark a calendar event as completed',
        request=CalendarEventCompleteSerializer,
        responses={200: CalendarEventSerializer},
        tags=['Calendar']
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        event = self.get_object()
        
        if event.is_completed:
            return Response(
                {'detail': 'Event is already completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        CalendarEventService.complete_event(event)
        
        output_serializer = CalendarEventSerializer(event)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Mark event as not completed',
        description='Mark a calendar event as not completed (reopen)',
        responses={200: CalendarEventSerializer},
        tags=['Calendar']
    )
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        event = self.get_object()
        
        if not event.is_completed:
            return Response(
                {'detail': 'Event is not completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.is_completed = False
        event.completed_at = None
        event.save(update_fields=['is_completed', 'completed_at', 'updated_at'])
        
        output_serializer = CalendarEventSerializer(event)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Get upcoming events',
        description='Get upcoming calendar events for the authenticated user',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Maximum number of events to return (default: 10)',
                required=False,
            ),
        ],
        responses={200: CalendarEventMinimalSerializer(many=True)},
        tags=['Calendar']
    )
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        try:
            limit = int(request.query_params.get('limit', 10))
        except (ValueError, TypeError):
            return Response({'error': 'Invalid limit parameter'}, status=status.HTTP_400_BAD_REQUEST)
        limit = min(limit, 100)
        
        events = CalendarEventService.get_upcoming_events(request.user, limit)
        serializer = CalendarEventMinimalSerializer(events, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get events by date range',
        description='Get calendar events within a specific date range',
        request=DateRangeSerializer,
        responses={200: CalendarEventSerializer(many=True)},
        tags=['Calendar']
    )
    @action(detail=False, methods=['post'])
    def by_range(self, request):
        serializer = DateRangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        events = CalendarEventService.get_events_in_range(
            user=request.user,
            start_date=serializer.validated_data['start_date'],
            end_date=serializer.validated_data['end_date']
        )
        
        output_serializer = CalendarEventSerializer(events, many=True)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Get event occurrences',
        description='Get all occurrences of a recurring event within a date range',
        parameters=[
            OpenApiParameter(
                'start_date',
                OpenApiTypes.DATETIME,
                description='Start date for occurrences',
                required=False,
            ),
            OpenApiParameter(
                'end_date',
                OpenApiTypes.DATETIME,
                description='End date for occurrences',
                required=False,
            ),
        ],
        responses={200: OpenApiResponse(description='List of occurrence datetimes')},
        tags=['Calendar']
    )
    @action(detail=True, methods=['get'])
    def occurrences(self, request, pk=None):
        event = self.get_object()
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        from django.utils.dateparse import parse_datetime
        if start_date:
            start_date = parse_datetime(start_date)
        if end_date:
            end_date = parse_datetime(end_date)
        
        occurrences = RecurrenceService.generate_occurrences(
            event, start_date, end_date
        )
        
        return Response({
            'event_id': str(event.id),
            'recurrence': event.recurrence,
            'occurrences': [occ.isoformat() for occ in occurrences]
        })

    @extend_schema(
        summary='Get calendar statistics',
        description='Get statistics about calendar events',
        responses={200: OpenApiResponse(description='Event statistics')},
        tags=['Calendar']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats = CalendarEventService.get_event_statistics(request.user)
        return Response(stats)

    @extend_schema(
        summary='Bulk create events',
        description='Create multiple calendar events at once',
        request=CalendarEventCreateSerializer(many=True),
        responses={201: CalendarEventSerializer(many=True)},
        tags=['Calendar']
    )
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        serializer = CalendarEventCreateSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        
        events = []
        for item in serializer.validated_data:
            event = CalendarEvent.objects.create(
                user=request.user,
                **item
            )
            events.append(event)
        
        output_serializer = CalendarEventSerializer(events, many=True)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Bulk delete events',
        description='Delete multiple calendar events at once',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'string'}}}},
        responses={204: OpenApiResponse(description='Events deleted successfully')},
        tags=['Calendar']
    )
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'No event IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count, _ = self.get_queryset().filter(id__in=ids).delete()
        return Response({'deleted_count': deleted_count})
