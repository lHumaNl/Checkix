import logging
from datetime import datetime, timedelta
from typing import List, Optional

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from string import Template as StringTemplate

from apps.notifications.models import (
    NotificationRule,
    NotificationSequence,
    NotificationLog,
    DynamicDueDateRule
)

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def send_email(
        recipient_email: str,
        subject: str,
        body: str,
        notification_log: Optional[NotificationLog] = None
    ) -> bool:
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )

            if notification_log:
                notification_log.status = 'sent'
                notification_log.sent_at = timezone.now()
                notification_log.save()

            logger.info(f"Email sent successfully to {recipient_email}")
            return True

        except Exception as e:
            error_message = str(e)
            logger.error(f"Failed to send email to {recipient_email}: {error_message}")

            if notification_log:
                notification_log.status = 'failed'
                notification_log.error_message = error_message
                notification_log.save()

            return False

    @staticmethod
    @transaction.atomic
    def schedule_notification(
        notification_rule: NotificationRule,
        checklist_instance,
        context_data: Optional[dict] = None
    ) -> List[NotificationLog]:
        if not notification_rule.is_active:
            return []

        logs = []
        sequences = notification_rule.sequences.all().order_by('sequence_order')

        for sequence in sequences:
            recipient_email = NotificationService._get_recipient_email(
                sequence, checklist_instance, context_data
            )

            if not recipient_email:
                logger.warning(
                    f"No recipient email found for sequence {sequence.id}"
                )
                continue

            subject = NotificationService._render_template(
                sequence.email_subject or f"Notification: {notification_rule.get_event_type_display()}",
                context_data or {}
            )
            body = NotificationService._render_template(
                sequence.email_body or "You have a new notification.",
                context_data or {}
            )

            scheduled_time = timezone.now() + timedelta(minutes=sequence.trigger_offset_minutes)

            log = NotificationLog.objects.create(
                notification_sequence=sequence,
                checklist_instance=checklist_instance,
                recipient_email=recipient_email,
                status='pending'
            )
            logs.append(log)

        return logs

    @staticmethod
    def _get_recipient_email(
        sequence: NotificationSequence,
        checklist_instance,
        context_data: Optional[dict] = None
    ) -> Optional[List[str]]:
        if sequence.recipient_type == 'custom':
            return [sequence.custom_email] if sequence.custom_email else None

        if sequence.recipient_type == 'assignee':
            if checklist_instance and checklist_instance.user and checklist_instance.user.email:
                return [checklist_instance.user.email]

        if sequence.recipient_type == 'group':
            if sequence.recipient_group:
                members = sequence.recipient_group.members.all()
                emails = [member.email for member in members if member.email]
                return emails if emails else None

        return None

    @staticmethod
    def _render_template(template_string: str, context: dict) -> str:
        try:
            template = StringTemplate(template_string)
            return template.safe_substitute(context)
        except Exception as e:
            logger.warning(f"Template rendering failed: {e}")
            return template_string

    @staticmethod
    @transaction.atomic
    def process_due_notifications() -> int:
        now = timezone.now()
        pending_logs = NotificationLog.objects.filter(
            status='pending'
        ).select_related(
            'notification_sequence',
            'checklist_instance'
        )

        sent_count = 0
        for log in pending_logs:
            sequence = log.notification_sequence
            scheduled_time = log.created_at + timedelta(
                minutes=sequence.trigger_offset_minutes
            )

            if now >= scheduled_time:
                subject = log.notification_sequence.email_subject or "Notification"
                body = log.notification_sequence.email_body or "You have a notification."

                success = NotificationService.send_email(
                    recipient_email=log.recipient_email,
                    subject=subject,
                    body=body,
                    notification_log=log
                )

                if success:
                    sent_count += 1

        return sent_count

    @staticmethod
    def retry_notification(log: NotificationLog) -> bool:
        if log.status != 'failed':
            return False

        log.status = 'pending'
        log.error_message = ''
        log.save()

        subject = log.notification_sequence.email_subject or "Notification"
        body = log.notification_sequence.email_body or "You have a notification."

        return NotificationService.send_email(
            recipient_email=log.recipient_email,
            subject=subject,
            body=body,
            notification_log=log
        )

    @staticmethod
    def get_notifications_for_checklist(checklist_instance) -> List[NotificationLog]:
        return NotificationLog.objects.filter(
            checklist_instance=checklist_instance
        ).select_related(
            'notification_sequence__notification_rule'
        ).order_by('-created_at')


class DynamicDueDateService:
    @staticmethod
    def calculate_due_date(
        rule: DynamicDueDateRule,
        trigger_time: Optional[datetime] = None
    ) -> datetime:
        if trigger_time is None:
            trigger_time = timezone.now()

        base_time = trigger_time

        if rule.trigger_type == 'checklist_start':
            base_time = trigger_time
        elif rule.trigger_type == 'item_completion':
            base_time = trigger_time
        elif rule.trigger_type == 'parameter_value':
            base_time = trigger_time
        elif rule.trigger_type == 'calendar_event':
            base_time = trigger_time

        if rule.business_days_only:
            due_date = DynamicDueDateService._add_business_days(
                base_time, rule.offset_minutes
            )
        else:
            due_date = base_time + timedelta(minutes=rule.offset_minutes)

        return due_date

    @staticmethod
    def _add_business_days(start_time: datetime, offset_minutes: int) -> datetime:
        days_to_add = offset_minutes // (24 * 60)
        remaining_minutes = offset_minutes % (24 * 60)

        current_date = start_time.date()
        business_days_added = 0

        while business_days_added < days_to_add:
            current_date += timedelta(days=1)
            if current_date.weekday() < 5:
                business_days_added += 1

        result = datetime.combine(current_date, start_time.time())
        if timezone.is_aware(start_time):
            result = timezone.make_aware(result, timezone.get_current_timezone())

        result += timedelta(minutes=remaining_minutes)

        return result

    @staticmethod
    def get_due_date_rules_for_template(template) -> List[DynamicDueDateRule]:
        return DynamicDueDateRule.objects.filter(
            checklist_template=template
        ).select_related('checklist_template', 'checklist_item')

    @staticmethod
    def get_due_date_rules_for_item(item) -> List[DynamicDueDateRule]:
        return DynamicDueDateRule.objects.filter(
            checklist_item=item
        ).select_related('checklist_template', 'checklist_item')
