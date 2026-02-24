import factory
from factory.django import DjangoModelFactory

from apps.calendar.models import CalendarEvent
from tests.factories.user_factory import UserFactory


class CalendarEventFactory(DjangoModelFactory):
    class Meta:
        model = CalendarEvent

    title = factory.Sequence(lambda n: f"Event {n}")
    user = factory.SubFactory(UserFactory)
    event_type = "custom"
    start_datetime = factory.Faker("date_time_this_year", tzinfo=None)
    all_day = False
    recurrence = "once"
    color = "#3498db"
