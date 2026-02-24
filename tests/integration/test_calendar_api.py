import pytest
from rest_framework import status

from tests.factories import UserFactory, CalendarEventFactory


@pytest.mark.django_db
class TestCalendarEventViewSet:
    def test_list_events(self, authenticated_client, user):
        CalendarEventFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/calendar/events/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_event(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/calendar/events/",
            {
                "title": "Team Meeting",
                "event_type": "custom",
                "start_datetime": "2026-03-01T10:00:00Z",
                "end_datetime": "2026-03-01T11:00:00Z",
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_update_event(self, authenticated_client, user):
        event = CalendarEventFactory(user=user)
        response = authenticated_client.patch(
            f"/api/v1/calendar/events/{event.id}/",
            {"title": "Updated Meeting"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_delete_event(self, authenticated_client, user):
        event = CalendarEventFactory(user=user)
        response = authenticated_client.delete(
            f"/api/v1/calendar/events/{event.id}/"
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_list_excludes_other_users(self, authenticated_client, user):
        CalendarEventFactory.create_batch(2, user=user)
        other = UserFactory()
        CalendarEventFactory.create_batch(3, user=other)
        response = authenticated_client.get("/api/v1/calendar/events/")
        data = response.data
        count = data["count"] if isinstance(data, dict) else len(data)
        assert count == 2
