"""Pydantic schemas package."""

from checkix.schemas.assignment import (
    AssignmentCreate,
    AssignmentOut,
)
from checkix.schemas.audit import AuditLogOut
from checkix.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventOut,
    CalendarEventUpdate,
)
from checkix.schemas.checklist import (
    ChecklistItemCreate,
    ChecklistItemOut,
    ChecklistItemUpdate,
    ChecklistTemplateCreate,
    ChecklistTemplateListOut,
    ChecklistTemplateOut,
    ChecklistTemplateUpdate,
    ChecklistVersionCreate,
    ChecklistVersionOut,
    PlaceholderCreate,
    PlaceholderOptionOut,
    PlaceholderOut,
)
from checkix.schemas.checklist_instance import (
    ChecklistInstanceCreate,
    ChecklistInstanceOut,
    ChecklistItemInstanceOut,
    CompletionLogOut,
)
from checkix.schemas.common import (
    MessageResponse,
    ORMSchema,
    PaginatedResponse,
    TokenRefreshRequest,
    TokenResponse,
)
from checkix.schemas.community import (
    CommunityTemplateCreate,
    CommunityTemplateOut,
    TemplateRatingCreate,
    TemplateRatingOut,
)
from checkix.schemas.folder import (
    FolderCreate,
    FolderOut,
    FolderTreeOut,
    FolderUpdate,
)
from checkix.schemas.ldap import LDAPSyncLogOut
from checkix.schemas.notification import (
    DynamicDueDateRuleOut,
    NotificationLogOut,
    NotificationRuleCreate,
    NotificationRuleOut,
    NotificationSequenceCreate,
    NotificationSequenceOut,
)
from checkix.schemas.run_link import (
    RunLinkCreate,
    RunLinkOut,
    RunLinkUpdate,
)
from checkix.schemas.stats import (
    ChecklistUsageStatsOut,
    DashboardStatsOut,
    OverallStatsOut,
)
from checkix.schemas.tag import (
    TagCreate,
    TagOut,
    TagUpdate,
)
from checkix.schemas.todo import (
    TodoItemCreate,
    TodoItemOut,
    TodoItemUpdate,
    TodoListCreate,
    TodoListOut,
    TodoListUpdate,
)
from checkix.schemas.user import (
    GroupCreate,
    GroupMembershipOut,
    GroupOut,
    UserGroupMembershipOut,
    UserMeOut,
    UserOut,
    UserPasswordChange,
    UserProfileOut,
    UserProfileUpdate,
)
from checkix.schemas.webhook import (
    WebhookCreate,
    WebhookEventOut,
    WebhookOut,
    WebhookUpdate,
)

__all__ = [
    # assignment
    "AssignmentOut",
    "AssignmentCreate",
    # audit
    "AuditLogOut",
    # calendar
    "CalendarEventOut",
    "CalendarEventCreate",
    "CalendarEventUpdate",
    # checklist
    "ChecklistTemplateListOut",
    "ChecklistTemplateOut",
    "ChecklistTemplateCreate",
    "ChecklistTemplateUpdate",
    "ChecklistVersionOut",
    "ChecklistVersionCreate",
    "ChecklistItemOut",
    "ChecklistItemCreate",
    "ChecklistItemUpdate",
    "PlaceholderOut",
    "PlaceholderCreate",
    "PlaceholderOptionOut",
    # checklist instance
    "ChecklistInstanceOut",
    "ChecklistInstanceCreate",
    "ChecklistItemInstanceOut",
    "CompletionLogOut",
    # common
    "ORMSchema",
    "PaginatedResponse",
    "MessageResponse",
    "TokenResponse",
    "TokenRefreshRequest",
    # community
    "CommunityTemplateOut",
    "CommunityTemplateCreate",
    "TemplateRatingOut",
    "TemplateRatingCreate",
    # folder
    "FolderOut",
    "FolderCreate",
    "FolderUpdate",
    "FolderTreeOut",
    # ldap
    "LDAPSyncLogOut",
    # notification
    "NotificationRuleOut",
    "NotificationRuleCreate",
    "DynamicDueDateRuleOut",
    "NotificationSequenceOut",
    "NotificationSequenceCreate",
    "NotificationLogOut",
    # run link
    "RunLinkOut",
    "RunLinkCreate",
    "RunLinkUpdate",
    # stats
    "ChecklistUsageStatsOut",
    "DashboardStatsOut",
    "OverallStatsOut",
    # tag
    "TagOut",
    "TagCreate",
    "TagUpdate",
    # todo
    "TodoListOut",
    "TodoListCreate",
    "TodoListUpdate",
    "TodoItemOut",
    "TodoItemCreate",
    "TodoItemUpdate",
    # user
    "UserOut",
    "UserMeOut",
    "UserPasswordChange",
    "UserProfileOut",
    "UserProfileUpdate",
    "GroupOut",
    "GroupCreate",
    "GroupMembershipOut",
    "UserGroupMembershipOut",
    # webhook
    "WebhookOut",
    "WebhookCreate",
    "WebhookUpdate",
    "WebhookEventOut",
]
