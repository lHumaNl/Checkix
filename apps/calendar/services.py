from datetime import timedelta, datetime
from typing import Optional, List, Dict, Any

from django.utils import timezone


class RecurrenceService:
    @staticmethod
    def generate_occurrences(event, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, max_occurrences: int = 100) -> List[datetime]:
        if event.recurrence == 'once':
            return [event.start_datetime]
        
        occurrences = []
        current = event.start_datetime
        interval = event.get_recurrence_interval()
        recurrence_end = event.get_recurrence_end_date()
        count_limit = event.get_recurrence_count()
        
        if start_date is None:
            start_date = timezone.now()
        if end_date is None:
            end_date = start_date + timedelta(days=365)
        
        occurrence_count = 0
        
        while current <= end_date and occurrence_count < max_occurrences:
            if recurrence_end and current > recurrence_end:
                break
            if count_limit and occurrence_count >= count_limit:
                break
            
            if current >= start_date:
                occurrences.append(current)
            
            current = RecurrenceService._get_next_occurrence(
                event, current, interval
            )
            occurrence_count += 1
        
        return occurrences

    @staticmethod
    def _get_next_occurrence(event, current: datetime, interval: int) -> datetime:
        if event.recurrence == 'daily':
            return current + timedelta(days=interval)
        elif event.recurrence == 'weekly':
            days_of_week = event.get_recurrence_days_of_week()
            if days_of_week:
                return RecurrenceService._next_weekday(current, days_of_week, interval)
            return current + timedelta(weeks=interval)
        elif event.recurrence == 'monthly':
            return RecurrenceService._add_months(current, interval)
        elif event.recurrence == 'custom':
            return RecurrenceService._handle_custom_recurrence(event, current, interval)
        return current + timedelta(days=1)

    @staticmethod
    def _next_weekday(current: datetime, days_of_week: List[int], interval: int) -> datetime:
        if not days_of_week:
            return current + timedelta(weeks=interval)
        
        days_of_week = sorted(days_of_week)
        current_weekday = current.weekday()
        
        for day in days_of_week:
            if day > current_weekday:
                return current + timedelta(days=(day - current_weekday))
        
        first_day = days_of_week[0]
        days_until_next = (7 - current_weekday) + first_day + (7 * (interval - 1))
        return current + timedelta(days=days_until_next)

    @staticmethod
    def _add_months(current: datetime, months: int) -> datetime:
        import calendar as cal
        month = current.month - 1 + months
        year = current.year + month // 12
        month = month % 12 + 1
        max_day = cal.monthrange(year, month)[1]
        day = min(current.day, max_day)
        return current.replace(year=year, month=month, day=day)

    @staticmethod
    def _handle_custom_recurrence(event, current: datetime, interval: int) -> datetime:
        rule = event.recurrence_rule or {}
        freq = rule.get('frequency', 'daily')
        
        if freq == 'daily':
            return current + timedelta(days=interval)
        elif freq == 'weekly':
            return current + timedelta(weeks=interval)
        elif freq == 'monthly':
            return RecurrenceService._add_months(current, interval)
        elif freq == 'yearly':
            return current.replace(year=current.year + interval)
        
        return current + timedelta(days=1)

    @staticmethod
    def build_recurrence_rule(
        frequency: str = 'daily',
        interval: int = 1,
        count: Optional[int] = None,
        end_date: Optional[datetime] = None,
        days_of_week: Optional[List[int]] = None,
        day_of_month: Optional[int] = None
    ) -> Dict[str, Any]:
        rule = {
            'frequency': frequency,
            'interval': interval,
        }
        
        if count is not None:
            rule['count'] = count
        if end_date is not None:
            rule['end_date'] = end_date.isoformat()
        if days_of_week is not None:
            rule['days_of_week'] = days_of_week
        if day_of_month is not None:
            rule['day_of_month'] = day_of_month
        
        return rule


class CalendarEventService:
    @staticmethod
    def create_checklist_instance_from_event(event) -> Optional[Any]:
        if event.event_type != 'checklist' or not event.checklist_template:
            return None
        
        try:
            from apps.checklists.services import ChecklistService
        except ImportError:
            return None
        
        template = event.checklist_template
        presets = event.template_presets or {}
        
        instance_data = {
            'template': template,
            'title': event.title,
            'user': event.user,
        }
        
        if presets.get('assignees'):
            instance_data['assignees'] = presets['assignees']
        if presets.get('tags'):
            instance_data['tags'] = presets['tags']
        if presets.get('priority'):
            instance_data['priority'] = presets['priority']
        if presets.get('custom_fields'):
            instance_data['custom_fields'] = presets['custom_fields']
        
        return instance_data

    @staticmethod
    def get_events_in_range(user, start_date: datetime, end_date: datetime) -> List[Any]:
        from apps.calendar.models import CalendarEvent
        
        events = CalendarEvent.objects.filter(
            user=user,
            start_datetime__gte=start_date,
            start_datetime__lte=end_date
        ).select_related('checklist_template', 'todo_list')
        
        return list(events)

    @staticmethod
    def get_upcoming_events(user, limit: int = 10) -> List[Any]:
        from apps.calendar.models import CalendarEvent
        
        now = timezone.now()
        
        events = CalendarEvent.objects.filter(
            user=user,
            start_datetime__gte=now,
            is_completed=False
        ).order_by('start_datetime')[:limit]
        
        return list(events)

    @staticmethod
    def get_events_needing_reminder(user) -> List[Any]:
        from apps.calendar.models import CalendarEvent
        from django.db.models import F, ExpressionWrapper, DateTimeField

        now = timezone.now()

        return list(
            CalendarEvent.objects.filter(
                user=user,
                start_datetime__gt=now,
                reminder_minutes_before__isnull=False,
                is_completed=False,
            ).annotate(
                reminder_time=ExpressionWrapper(
                    F('start_datetime') - timedelta(minutes=1) * F('reminder_minutes_before'),
                    output_field=DateTimeField(),
                )
            ).filter(
                reminder_time__lte=now,
            )
        )

    @staticmethod
    def complete_event(event) -> Any:
        event.mark_completed()
        
        if event.event_type == 'checklist' and event.checklist_template:
            CalendarEventService.create_checklist_instance_from_event(event)
        
        return event

    @staticmethod
    def get_event_statistics(user) -> Dict[str, Any]:
        from apps.calendar.models import CalendarEvent
        from django.db.models import Count
        
        events = CalendarEvent.objects.filter(user=user)
        
        total = events.count()
        completed = events.filter(is_completed=True).count()
        
        by_type = events.values('event_type').annotate(count=Count('id'))
        by_type_dict = {item['event_type']: item['count'] for item in by_type}
        
        by_recurrence = events.values('recurrence').annotate(count=Count('id'))
        by_recurrence_dict = {item['recurrence']: item['count'] for item in by_recurrence}
        
        now = timezone.now()
        upcoming = events.filter(start_datetime__gt=now, is_completed=False).count()
        overdue = events.filter(
            start_datetime__lt=now,
            is_completed=False,
            end_datetime__lt=now
        ).count()
        
        return {
            'total_events': total,
            'completed_events': completed,
            'pending_events': total - completed,
            'completion_rate': round((completed / total * 100) if total > 0 else 0, 2),
            'by_type': by_type_dict,
            'by_recurrence': by_recurrence_dict,
            'upcoming_events': upcoming,
            'overdue_events': overdue,
        }
