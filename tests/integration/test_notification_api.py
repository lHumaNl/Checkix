import pytest
from rest_framework import status

from tests.factories import (
    UserFactory,
    ChecklistTemplateFactory,
    ChecklistInstanceFactory,
    NotificationRuleFactory,
    NotificationSequenceFactory,
    NotificationLogFactory,
    DynamicDueDateRuleFactory,
)


@pytest.mark.django_db
class TestNotificationRuleViewSet:
    def test_list_notification_rules(self, authenticated_client, user):
        NotificationRuleFactory.create_batch(3, created_by=user)
        
        response = authenticated_client.get('/api/v1/notifications/rules/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_notification_rules_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        NotificationRuleFactory.create_batch(2, created_by=user)
        NotificationRuleFactory.create_batch(3, created_by=other_user)
        
        response = authenticated_client.get('/api/v1/notifications/rules/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_create_notification_rule(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/notifications/rules/',
            {
                'checklist_template': template.id,
                'event_type': 'task_due_in',
                'is_active': True,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['event_type'] == 'task_due_in'

    def test_create_sets_created_by(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/notifications/rules/',
            {
                'checklist_template': template.id,
                'event_type': 'task_completed',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_retrieve_notification_rule(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        
        response = authenticated_client.get(f'/api/v1/notifications/rules/{rule.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == rule.id

    def test_update_notification_rule(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user, is_active=True)
        
        response = authenticated_client.patch(
            f'/api/v1/notifications/rules/{rule.id}/',
            {'is_active': False},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is False

    def test_delete_notification_rule(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        
        response = authenticated_client.delete(f'/api/v1/notifications/rules/{rule.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_toggle_active(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user, is_active=True)
        
        response = authenticated_client.post(f'/api/v1/notifications/rules/{rule.id}/toggle_active/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is False

    def test_add_sequence(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        
        response = authenticated_client.post(
            f'/api/v1/notifications/rules/{rule.id}/add_sequence/',
            {
                'sequence_order': 1,
                'trigger_offset_minutes': 30,
                'recipient_type': 'assignee',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_stats_action(self, authenticated_client, user):
        NotificationRuleFactory.create_batch(3, created_by=user, is_active=True)
        NotificationRuleFactory(created_by=user, is_active=False)
        
        response = authenticated_client.get('/api/v1/notifications/rules/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_rules'] == 4
        assert response.data['active_rules'] == 3

    def test_cannot_access_other_users_rule(self, authenticated_client, user):
        other_user = UserFactory()
        rule = NotificationRuleFactory(created_by=other_user)
        
        response = authenticated_client.get(f'/api/v1/notifications/rules/{rule.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationLogViewSet:
    def test_list_notification_logs(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        sequence = NotificationSequenceFactory(notification_rule=rule)
        NotificationLogFactory.create_batch(3, notification_sequence=sequence)
        
        response = authenticated_client.get('/api/v1/notifications/logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_notification_logs_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        rule1 = NotificationRuleFactory(created_by=user)
        seq1 = NotificationSequenceFactory(notification_rule=rule1)
        rule2 = NotificationRuleFactory(created_by=other_user)
        seq2 = NotificationSequenceFactory(notification_rule=rule2)
        
        NotificationLogFactory.create_batch(2, notification_sequence=seq1)
        NotificationLogFactory.create_batch(3, notification_sequence=seq2)
        
        response = authenticated_client.get('/api/v1/notifications/logs/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_retrieve_notification_log(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        sequence = NotificationSequenceFactory(notification_rule=rule)
        log = NotificationLogFactory(notification_sequence=sequence)
        
        response = authenticated_client.get(f'/api/v1/notifications/logs/{log.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == log.id

    def test_retry_failed_log(self, authenticated_client, user):
        from unittest.mock import patch
        
        rule = NotificationRuleFactory(created_by=user)
        sequence = NotificationSequenceFactory(notification_rule=rule)
        log = NotificationLogFactory(notification_sequence=sequence, status='failed')
        
        with patch('apps.notifications.services.NotificationService.retry_notification', return_value=True):
            response = authenticated_client.post(f'/api/v1/notifications/logs/{log.id}/retry/')
        
        assert response.status_code == status.HTTP_200_OK

    def test_retry_non_failed_log_fails(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        sequence = NotificationSequenceFactory(notification_rule=rule)
        log = NotificationLogFactory(notification_sequence=sequence, status='sent')
        
        response = authenticated_client.post(f'/api/v1/notifications/logs/{log.id}/retry/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_stats_action(self, authenticated_client, user):
        rule = NotificationRuleFactory(created_by=user)
        sequence = NotificationSequenceFactory(notification_rule=rule)
        NotificationLogFactory.create_batch(2, notification_sequence=sequence, status='sent')
        NotificationLogFactory(notification_sequence=sequence, status='failed')
        
        response = authenticated_client.get('/api/v1/notifications/logs/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_logs'] == 3
        assert response.data['sent'] == 2


@pytest.mark.django_db
class TestDynamicDueDateRuleViewSet:
    def test_list_due_date_rules(self, authenticated_client, user):
        DynamicDueDateRuleFactory.create_batch(3, created_by=user)
        
        response = authenticated_client.get('/api/v1/notifications/due-date-rules/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_due_date_rules_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        DynamicDueDateRuleFactory.create_batch(2, created_by=user)
        DynamicDueDateRuleFactory.create_batch(3, created_by=other_user)
        
        response = authenticated_client.get('/api/v1/notifications/due-date-rules/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_create_due_date_rule(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/notifications/due-date-rules/',
            {
                'checklist_template': template.id,
                'trigger_type': 'checklist_start',
                'offset_minutes': 60,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['offset_minutes'] == 60

    def test_create_sets_created_by(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/notifications/due-date-rules/',
            {
                'checklist_template': template.id,
                'trigger_type': 'item_completion',
                'offset_minutes': 30,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_update_due_date_rule(self, authenticated_client, user):
        rule = DynamicDueDateRuleFactory(created_by=user, offset_minutes=60)
        
        response = authenticated_client.patch(
            f'/api/v1/notifications/due-date-rules/{rule.id}/',
            {'offset_minutes': 120},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['offset_minutes'] == 120

    def test_delete_due_date_rule(self, authenticated_client, user):
        rule = DynamicDueDateRuleFactory(created_by=user)
        
        response = authenticated_client.delete(f'/api/v1/notifications/due-date-rules/{rule.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_stats_action(self, authenticated_client, user):
        DynamicDueDateRuleFactory(created_by=user, trigger_type='checklist_start')
        DynamicDueDateRuleFactory(created_by=user, trigger_type='item_completion')
        DynamicDueDateRuleFactory(created_by=user, business_days_only=True)
        
        response = authenticated_client.get('/api/v1/notifications/due-date-rules/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_rules'] == 3
        assert response.data['business_days_only_count'] == 1
