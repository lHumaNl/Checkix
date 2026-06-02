"""Checkix SQLAlchemy models."""

from checkix.models.base import Base, SoftDeleteMixin, TimestampMixin
from checkix.models.user import User, UserProfile, Group, GroupMembership
from checkix.models.tag import Tag
from checkix.models.folder import Folder
from checkix.models.checklist import (
    ChecklistTemplate,
    ChecklistVersion,
    Placeholder,
    PlaceholderOption,
    ChecklistItem,
)
from checkix.models.checklist_instance import ChecklistInstance, ChecklistItemInstance, CompletionLog
from checkix.models.todo import TodoList, TodoItem
from checkix.models.calendar import CalendarEvent
from checkix.models.assignment import Assignment
from checkix.models.notification import DynamicDueDateRule, NotificationRule, NotificationSequence, NotificationLog
from checkix.models.webhook import Webhook, WebhookEvent
from checkix.models.audit import AuditLog
from checkix.models.run_link import RunLink
from checkix.models.community import CommunityTemplate, TemplateRating
from checkix.models.stats import ChecklistUsageStats
from checkix.models.ldap import LDAPSyncLog

__all__ = [
    # Mixins
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    # User & auth
    "User",
    "UserProfile",
    "Group",
    "GroupMembership",
    # Tagging & folders
    "Tag",
    "Folder",
    # Checklist definitions
    "ChecklistTemplate",
    "ChecklistVersion",
    "Placeholder",
    "PlaceholderOption",
    "ChecklistItem",
    # Checklist instances
    "ChecklistInstance",
    "ChecklistItemInstance",
    "CompletionLog",
    # Todo
    "TodoList",
    "TodoItem",
    # Calendar
    "CalendarEvent",
    # Assignment
    "Assignment",
    # Notifications
    "DynamicDueDateRule",
    "NotificationRule",
    "NotificationSequence",
    "NotificationLog",
    # Webhooks
    "Webhook",
    "WebhookEvent",
    # Audit
    "AuditLog",
    # Run links
    "RunLink",
    # Community
    "CommunityTemplate",
    "TemplateRating",
    # Stats
    "ChecklistUsageStats",
    # LDAP
    "LDAPSyncLog",
]
