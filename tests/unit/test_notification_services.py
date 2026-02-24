import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.utils import timezone

from apps.notifications.services import NotificationService, DynamicDueDateService
from tests.factories import (
    UserFactory,
    GroupFactory,
    GroupMembershipFactory,
    ChecklistTemplateFactory,
    NotificationRuleFactory,
    NotificationSequenceFactory,
    NotificationLogFactory,
    DynamicDueDateRuleFactory,
    ChecklistInstanceFactory,
)


@pytest.mark.django_db
class TestNotificationService:
    def test_send_email_success(self):
        log = NotificationLogFactory(status='pending')
        
        with patch('apps.notifications.services.send_mail') as mock_send:
            mock_send.return_value = 1
            result = NotificationService.send_email(
                recipient_email='test@example.com',
                subject='Test',
                body='Test body',
                notification_log=log,
            )
        
        assert result is True
        log.refresh_from_db()
        assert log.status == 'sent'
        assert log.sent_at is not None

    def test_send_email_failure(self):
        log = NotificationLogFactory(status='pending')
        
        with patch('apps.notifications.services.send_mail') as mock_send:
            mock_send.side_effect = Exception('SMTP error')
            result = NotificationService.send_email(
                recipient_email='test@example.com',
                subject='Test',
                body='Test body',
                notification_log=log,
            )
        
        assert result is False
        log.refresh_from_db()
        assert log.status == 'failed'
        assert 'SMTP error' in log.error_message

    def test_schedule_notification_skips_inactive_rule(self):
        rule = NotificationRuleFactory(is_active=False)
        instance = ChecklistInstanceFactory()
        
        logs = NotificationService.schedule_notification(rule, instance)
        assert len(logs) == 0

    def test_schedule_notification_creates_logs(self):
        rule = NotificationRuleFactory(is_active=True)
        NotificationSequenceFactory(notification_rule=rule)
        instance = ChecklistInstanceFactory()
        
        logs = NotificationService.schedule_notification(rule, instance)
        assert len(logs) == 1

    def test_get_recipient_email_custom(self):
        sequence = NotificationSequenceFactory(
            recipient_type='custom',
            custom_email='custom@example.com',
        )
        instance = ChecklistInstanceFactory()
        
        email = NotificationService._get_recipient_email(sequence, instance)
        assert email == ['custom@example.com']

    def test_get_recipient_email_assignee(self):
        user = UserFactory(email='assignee@example.com')
        instance = ChecklistInstanceFactory(user=user)
        sequence = NotificationSequenceFactory(recipient_type='assignee')
        
        email = NotificationService._get_recipient_email(sequence, instance)
        assert email == ['assignee@example.com']

    def test_get_recipient_email_group(self):
        group = GroupFactory()
        user1 = UserFactory(email='user1@example.com')
        user2 = UserFactory(email='user2@example.com')
        GroupMembershipFactory(user=user1, group=group)
        GroupMembershipFactory(user=user2, group=group)
        
        sequence = NotificationSequenceFactory(
            recipient_type='group',
            recipient_group=group,
        )
        instance = ChecklistInstanceFactory()
        
        emails = NotificationService._get_recipient_email(sequence, instance)
        assert set(emails) == {'user1@example.com', 'user2@example.com'}

    def test_render_template_safe_substitution(self):
        template = "Hello ${name}, your task is due."
        context = {'name': 'John'}
        
        result = NotificationService._render_template(template, context)
        assert result == "Hello John, your task is due."

    def test_render_template_missing_variable_safe(self):
        template = "Hello ${name}, your score is ${score}."
        context = {'name': 'John'}
        
        result = NotificationService._render_template(template, context)
        assert 'John' in result
        assert '${score}' in result

    def test_render_template_no_ssti_vulnerability(self):
        template = "${__class__.__bases__[0].__subclasses__()}"
        context = {}
        
        result = NotificationService._render_template(template, context)
        assert '__subclasses__' not in result or '${' in result

    def test_retry_notification_only_failed(self):
        log = NotificationLogFactory(status='sent')
        
        result = NotificationService.retry_notification(log)
        assert result is False

    def test_retry_notification_success(self):
        log = NotificationLogFactory(status='failed')
        
        with patch.object(NotificationService, 'send_email', return_value=True) as mock_send:
            mock_send.return_value = True
            result = NotificationService.retry_notification(log)
        
        assert result is True

    def test_get_notifications_for_checklist(self):
        instance = ChecklistInstanceFactory()
        log1 = NotificationLogFactory(checklist_instance=instance)
        log2 = NotificationLogFactory(checklist_instance=instance)
        other_log = NotificationLogFactory()
        
        logs = NotificationService.get_notifications_for_checklist(instance)
        assert len(logs) == 2
        assert log1 in logs
        assert log2 in logs
        assert other_log not in logs


@pytest.mark.django_db
class TestDynamicDueDateService:
    def test_calculate_due_date_checklist_start(self):
        rule = DynamicDueDateRuleFactory(
            trigger_type='checklist_start',
            offset_minutes=120,
            business_days_only=False,
        )
        trigger_time = timezone.now()
        
        due_date = DynamicDueDateService.calculate_due_date(rule, trigger_time)
        expected = trigger_time + timedelta(minutes=120)
        assert abs((due_date - expected).total_seconds()) < 1

    def test_calculate_due_date_item_completion(self):
        rule = DynamicDueDateRuleFactory(
            trigger_type='item_completion',
            offset_minutes=60,
            business_days_only=False,
        )
        trigger_time = timezone.now()
        
        due_date = DynamicDueDateService.calculate_due_date(rule, trigger_time)
        expected = trigger_time + timedelta(minutes=60)
        assert abs((due_date - expected).total_seconds()) < 1

    def test_calculate_due_date_parameter_value(self):
        rule = DynamicDueDateRuleFactory(
            trigger_type='parameter_value',
            offset_minutes=30,
            business_days_only=False,
        )
        trigger_time = timezone.now()
        
        due_date = DynamicDueDateService.calculate_due_date(rule, trigger_time)
        expected = trigger_time + timedelta(minutes=30)
        assert abs((due_date - expected).total_seconds()) < 1

    def test_calculate_due_date_business_days(self):
        rule = DynamicDueDateRuleFactory(
            trigger_type='checklist_start',
            offset_minutes=1440,
            business_days_only=True,
        )
        from datetime import datetime
        friday = datetime(2024, 1, 5, 12, 0, 0)
        friday = timezone.make_aware(friday)
        
        due_date = DynamicDueDateService.calculate_due_date(rule, friday)
        assert due_date.weekday() < 5

    def test_get_due_date_rules_for_template(self):
        template = ChecklistTemplateFactory()
        rule1 = DynamicDueDateRuleFactory(checklist_template=template)
        rule2 = DynamicDueDateRuleFactory(checklist_template=template)
        other_rule = DynamicDueDateRuleFactory()
        
        rules = DynamicDueDateService.get_due_date_rules_for_template(template)
        assert len(rules) == 2
        assert rule1 in rules
        assert rule2 in rules
        assert other_rule not in rules
