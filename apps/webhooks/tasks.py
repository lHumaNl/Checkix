from celery import shared_task
from django.utils import timezone

from apps.webhooks.models import WebhookEvent
from apps.webhooks.services import WebhookService


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True
)
def deliver_webhook(self, event_id: str):
    try:
        event = WebhookEvent.objects.select_related('webhook').get(id=event_id)
    except WebhookEvent.DoesNotExist:
        return False

    if event.status not in ['pending', 'retrying']:
        return False

    success = WebhookService.deliver(event)

    if not success and event.status == 'retrying' and event.retry_count < event.max_retries:
        raise self.retry()

    return success


@shared_task
def process_webhook_retries():
    return WebhookService.process_pending_retries()


@shared_task
def cleanup_old_webhook_events(days: int = 90):
    cutoff_date = timezone.now() - timezone.timedelta(days=days)
    
    deleted, _ = WebhookEvent.objects.filter(
        created_at__lt=cutoff_date,
        status__in=['sent', 'failed']
    ).delete()
    
    return deleted


@shared_task
def trigger_webhook_event(user_id: str, event_type: str, payload: dict, checklist_instance_id: str = None):
    from django.contrib.auth import get_user_model
    from apps.checklist_instances.models import ChecklistInstance

    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return []

    checklist_instance = None
    if checklist_instance_id:
        try:
            checklist_instance = ChecklistInstance.objects.get(id=checklist_instance_id)
        except ChecklistInstance.DoesNotExist:
            pass

    return WebhookService.trigger_event(
        user=user,
        event_type=event_type,
        payload=payload,
        checklist_instance=checklist_instance
    )


@shared_task
def send_webhook_for_checklist_event(checklist_instance_id: str, event_type: str):
    from apps.checklist_instances.models import ChecklistInstance

    try:
        instance = ChecklistInstance.objects.select_related('user', 'template', 'version').get(
            id=checklist_instance_id
        )
    except ChecklistInstance.DoesNotExist:
        return []

    payload = WebhookService.build_checklist_payload(instance, event_type)

    return WebhookService.trigger_event(
        user=instance.user,
        event_type=event_type,
        payload=payload,
        checklist_instance=instance
    )


@shared_task
def send_webhook_for_item_event(item_instance_id: str, event_type: str):
    from apps.checklist_instances.models import ChecklistItemInstance

    try:
        item_instance = ChecklistItemInstance.objects.select_related(
            'instance', 'instance__user'
        ).get(id=item_instance_id)
    except ChecklistItemInstance.DoesNotExist:
        return []

    payload = WebhookService.build_item_payload(item_instance, event_type)

    return WebhookService.trigger_event(
        user=item_instance.instance.user,
        event_type=event_type,
        payload=payload,
        checklist_instance=item_instance.instance
    )
