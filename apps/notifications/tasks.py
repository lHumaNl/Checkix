import logging
from celery import shared_task

from django.db import transaction

from apps.notifications.models import NotificationLog, NotificationRule
from apps.notifications.services import NotificationService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email(self, notification_log_id: int):
    try:
        log = NotificationLog.objects.select_related(
            'notification_sequence'
        ).get(id=notification_log_id)
    except NotificationLog.DoesNotExist:
        logger.error(f"NotificationLog {notification_log_id} not found")
        return

    if log.status != 'pending':
        logger.info(f"NotificationLog {notification_log_id} already processed")
        return

    sequence = log.notification_sequence
    subject = sequence.email_subject or "Notification"
    body = sequence.email_body or "You have a notification."

    try:
        success = NotificationService.send_email(
            recipient_email=log.recipient_email,
            subject=subject,
            body=body,
            notification_log=log
        )

        if not success:
            raise Exception("Failed to send email")

    except Exception as e:
        logger.error(f"Error sending notification {notification_log_id}: {e}")
        raise self.retry(exc=e)


@shared_task
def process_pending_notifications():
    sent_count = NotificationService.process_due_notifications()
    logger.info(f"Processed {sent_count} pending notifications")
    return sent_count


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def retry_failed_notification(self, notification_log_id: int):
    try:
        log = NotificationLog.objects.get(id=notification_log_id)
    except NotificationLog.DoesNotExist:
        logger.error(f"NotificationLog {notification_log_id} not found")
        return

    if log.status != 'failed':
        logger.info(f"NotificationLog {notification_log_id} is not failed")
        return

    try:
        success = NotificationService.retry_notification(log)
        if not success:
            raise Exception("Retry failed")
    except Exception as e:
        logger.error(f"Error retrying notification {notification_log_id}: {e}")
        raise self.retry(exc=e)


@shared_task
def send_bulk_notifications(notification_log_ids: list):
    results = {'sent': 0, 'failed': 0}

    for log_id in notification_log_ids:
        try:
            send_notification_email.delay(log_id)
            results['sent'] += 1
        except Exception as e:
            logger.error(f"Error queueing notification {log_id}: {e}")
            results['failed'] += 1

    return results


@shared_task
@transaction.atomic
def cleanup_old_notification_logs(days_old: int = 90):
    from django.utils import timezone
    from datetime import timedelta

    cutoff_date = timezone.now() - timedelta(days=days_old)

    deleted, _ = NotificationLog.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['sent', 'failed']
    ).delete()

    logger.info(f"Cleaned up {deleted} old notification logs")
    return deleted


@shared_task
def check_task_due_notifications():
    from datetime import timedelta
    from django.utils import timezone

    rules = NotificationRule.objects.filter(
        is_active=True,
        event_type='task_due_in'
    ).select_related('checklist_template').prefetch_related('sequences')

    notifications_created = 0

    for rule in rules:
        from apps.checklist_instances.models import ChecklistInstance

        instances = ChecklistInstance.objects.filter(
            template=rule.checklist_template,
            status='in_progress'
        )

        for instance in instances:
            for sequence in rule.sequences.all():
                scheduled_time = timezone.now() + timedelta(
                    minutes=sequence.trigger_offset_minutes
                )

                existing_log = NotificationLog.objects.filter(
                    notification_sequence=sequence,
                    checklist_instance=instance
                ).exists()

                if not existing_log:
                    NotificationLog.objects.create(
                        notification_sequence=sequence,
                        checklist_instance=instance,
                        recipient_email=NotificationService._get_recipient_email(
                            sequence, instance, {}
                        ) or '',
                        status='pending'
                    )
                    notifications_created += 1

    logger.info(f"Created {notifications_created} task due notifications")
    return notifications_created


@shared_task
def check_overdue_task_notifications():
    from datetime import timedelta
    from django.utils import timezone

    rules = NotificationRule.objects.filter(
        is_active=True,
        event_type='task_overdue_by'
    ).select_related('checklist_template').prefetch_related('sequences')

    notifications_created = 0

    for rule in rules:
        from apps.checklist_instances.models import ChecklistInstance

        instances = ChecklistInstance.objects.filter(
            template=rule.checklist_template,
            status='in_progress'
        )

        for instance in instances:
            for sequence in rule.sequences.all():
                existing_log = NotificationLog.objects.filter(
                    notification_sequence=sequence,
                    checklist_instance=instance
                ).exists()

                if not existing_log:
                    NotificationLog.objects.create(
                        notification_sequence=sequence,
                        checklist_instance=instance,
                        recipient_email=NotificationService._get_recipient_email(
                            sequence, instance, {}
                        ) or '',
                        status='pending'
                    )
                    notifications_created += 1

    logger.info(f"Created {notifications_created} overdue task notifications")
    return notifications_created


@shared_task
def generate_notification_stats():
    total_logs = NotificationLog.objects.count()
    pending_logs = NotificationLog.objects.filter(status='pending').count()
    sent_logs = NotificationLog.objects.filter(status='sent').count()
    failed_logs = NotificationLog.objects.filter(status='failed').count()

    total_rules = NotificationRule.objects.count()
    active_rules = NotificationRule.objects.filter(is_active=True).count()

    stats = {
        'logs': {
            'total': total_logs,
            'pending': pending_logs,
            'sent': sent_logs,
            'failed': failed_logs,
            'success_rate': round((sent_logs / total_logs * 100), 2) if total_logs > 0 else 0
        },
        'rules': {
            'total': total_rules,
            'active': active_rules,
            'inactive': total_rules - active_rules
        }
    }

    logger.info(f"Notification stats: {stats}")
    return stats
