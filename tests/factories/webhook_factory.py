import factory
from factory.django import DjangoModelFactory

from apps.webhooks.models import Webhook, WebhookEvent
from tests.factories.user_factory import UserFactory
from tests.factories.instance_factory import ChecklistInstanceFactory


class WebhookFactory(DjangoModelFactory):
    class Meta:
        model = Webhook

    name = factory.Sequence(lambda n: f"Webhook {n}")
    user = factory.SubFactory(UserFactory)
    event_type = 'checklist_completed'
    endpoint_url = factory.Sequence(lambda n: f"https://example.com/webhook/{n}")
    is_active = True
    headers = factory.LazyFunction(lambda: {"X-Custom-Header": "test"})


class WebhookEventFactory(DjangoModelFactory):
    class Meta:
        model = WebhookEvent

    webhook = factory.SubFactory(WebhookFactory)
    checklist_instance = factory.SubFactory(ChecklistInstanceFactory)
    event_type = 'checklist_completed'
    payload = factory.LazyFunction(lambda: {"test": "data"})
    status = 'pending'
    retry_count = 0
    max_retries = 3
