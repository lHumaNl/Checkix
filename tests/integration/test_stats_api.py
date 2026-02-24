import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework import status

from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    ChecklistUsageStatsFactory,
)


@pytest.mark.django_db
class TestStatsViewSet:
    def test_list_stats(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        ChecklistUsageStatsFactory.create_batch(3, template=template)
        response = authenticated_client.get("/api/v1/stats/")
        assert response.status_code == status.HTTP_200_OK

    def test_overall_stats(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()
        ChecklistUsageStatsFactory(
            template=template, date=today, instances_created=10, instances_completed=8
        )
        response = authenticated_client.get("/api/v1/stats/overall/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_instances_created"] == 10

    def test_by_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()
        ChecklistUsageStatsFactory(
            template=template, date=today, instances_created=5
        )
        response = authenticated_client.get(
            f"/api/v1/stats/by_template/?template_id={template.id}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_instances_created"] == 5

    def test_by_template_requires_template_id(self, authenticated_client, user):
        response = authenticated_client.get("/api/v1/stats/by_template/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_recent_stats(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()
        ChecklistUsageStatsFactory(template=template, date=today)
        response = authenticated_client.get("/api/v1/stats/recent/?days=7")
        assert response.status_code == status.HTTP_200_OK

    def test_by_date_range(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()
        ChecklistUsageStatsFactory(template=template, date=today, instances_created=10)
        ChecklistUsageStatsFactory(
            template=template,
            date=today - timedelta(days=30),
            instances_created=5,
        )

        response = authenticated_client.post(
            "/api/v1/stats/by_date_range/",
            {
                "start_date": str(today - timedelta(days=1)),
                "end_date": str(today),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_top_templates(self, authenticated_client, user):
        t1 = ChecklistTemplateFactory(user=user)
        t2 = ChecklistTemplateFactory(user=user)
        today = timezone.now().date()
        ChecklistUsageStatsFactory(
            template=t1, date=today, instances_created=10, instances_completed=8
        )
        ChecklistUsageStatsFactory(
            template=t2, date=today, instances_created=5, instances_completed=3
        )

        response = authenticated_client.get(
            "/api/v1/stats/top_templates/",
            {
                "start_date": str(today - timedelta(days=1)),
                "end_date": str(today + timedelta(days=1)),
            },
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]["total_instances"] == 10
