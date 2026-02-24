# Checkix (cx) - Project Specification

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [System Architecture](#system-architecture)
4. [Data Model](#data-model)
5. [API Endpoints](#api-endpoints)
6. [Functional Requirements](#functional-requirements)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Security](#security)
9. [Deployment](#deployment)
10. [Testing Strategy](#testing-strategy)
11. [Future Enhancements](#future-enhancements)

---

## Project Overview

**Project Name:** Checkix (short: cx)

**Description:** Enterprise-grade web application for managing reusable checklists and one-time todo lists with calendar integration, statistical tracking, team collaboration, and advanced automation features.

**Short Name:** cx (like "k8s" for Kubernetes)

**Key Differentiators:**
- Auto-assignments with LDAP/GPO integration
- Dynamic due dates with conditional logic
- Multi-level notification sequences
- Real-time collaboration and updates
- Webhook-driven integrations
- Advanced audit trail for compliance
- Template library with community sharing
- Run links for one-click instant creation
- Matrix-inspired architecture (ix = cross/matrix)

**Core Concepts:**

### Checklists (Templates)
- Reusable procedural templates for recurring tasks
- Support for sequential (flow-based) or free-form execution
- Version control with history and rollback capability
- Placeholder-based conditional logic (dropdown selections show/hide sub-items)
- Categorization via tags and folders
- Statistics on usage frequency and completion rates

### Checklist Instances
- Concrete executions created from templates
- Snapshot copy of template items at creation time
- Optional editing during execution (save to instance or template)
- Progress tracking with timestamps
- Completion status

### Todo Lists
- One-time task lists for ad-hoc activities
- Sent to history after completion
- Can be converted to checklist templates
- Reschedulable via calendar
- Tag and folder organization

### Calendar
- Schedule checklist instances and todo lists
- Configure template presets with default values
- Drag-and-drop rescheduling
- Daily, hourly, weekly, and custom period support
- Notification triggers (future)

### Statistics
- Completion time tracking
- Percentage completion metrics
- Template usage frequency
- Individual and aggregate analytics
- Heatmaps and trend visualizations

---

## Technical Stack

### Backend
- **Framework:** Django 5.x
- **API:** Django REST Framework (DRF) 3.15+
- **Documentation:** drf-spectacular (OpenAPI 3.1) / Swagger UI
- **Database:**
  - Development: SQLite 3
  - Production: PostgreSQL 16+
- **Task Queue:** Celery + Redis (for notifications, webhooks, background tasks)
- **Authentication:** Django Rest Framework SimpleJWT
- **Pagination:** DRF PageNumberPagination
- **Filtering:** Django Filters
- **CORS:** django-cors-headers (if needed for frontend)
- **Email:** django-anymail (SendGrid, Mailgun, etc.) or django.core.mail
- **LDAP:** django-auth-ldap (for LDAP/GPO integration)
- **Webhooks:** requests (for webhook delivery)
- **Real-time:** Django Channels + channels-redis (implemented)
- **HMAC:** cryptography (for webhook signature verification)

### Frontend
- **Framework:** React 19 + TypeScript
- **State Management:** TanStack React Query (server state) + React Context (auth)
- **UI Component Library:** TailwindCSS v4 + Radix UI
- **Calendar:** React Big Calendar
- **Build Tool:** Vite
- **PWA:** vite-plugin-pwa (offline support, installable)
- **WebSocket:** Custom useWebSocket hook with auto-reconnect

### Development Tools
- **Code Quality:** Black, isort, flake8, mypy
- **Testing:** pytest, pytest-django, pytest-cov, pytest-asyncio
- **API Testing:** Postman / Insomnia / pytest-httpx
- **Documentation:** Sphinx / MkDocs (for developer docs)
- **Version Control:** Git
- **Containerization:** Docker, Docker Compose
- **CI/CD:** GitHub Actions / GitLab CI

---

## System Architecture

### Project Structure

```
Checkix/  # or cx/ for short
├── config/                      # Django project settings
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py              # Common settings
│   │   ├── development.py       # Dev overrides
│   │   ├── production.py        # Prod overrides
│   │   └── test.py              # Test overrides
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── core/                    # Base models, utilities
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── exceptions.py
│   │   ├── permissions.py
│   │   ├── serializers.py
│   │   ├── filters.py
│   │   ├── validators.py
│   │   └── utils.py
│   ├── users/                   # User management
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── permissions.py
│   ├── tags/                    # Tag management
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── folders/                 # Folder management
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── checklists/              # Checklist templates
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py          # Business logic
│   │   └── exceptions.py
│   ├── checklist_instances/     # Checklist executions
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   ├── todo/                    # Todo lists
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   ├── calendar/                # Calendar scheduling
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   ├── assignments/              # Auto-assignments
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   ├── notifications/            # Multi-level notifications
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tasks.py             # Celery tasks for email sending
│   ├── webhooks/                # Webhook integrations
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tasks.py             # Celery tasks for webhook delivery
│   ├── audit/                   # Advanced audit trail
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   ├── run_links/               # One-click run links
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── community/               # Template library
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   ├── stats/                   # Statistics & analytics
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services.py
│   └── ldap/                    # LDAP/GPO integration
│       ├── __init__.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── services.py
│       └── backends.py          # Custom authentication backend
├── static/
├── media/
├── templates/                   # If server-side rendering needed
├── locale/                      # i18n translations (future)
├── scripts/
│   ├── manage.py
│   └── init_db.py               # Database initialization
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── factories/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── api/
│   └── architecture.md
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── pyproject.toml              # Poetry / dependency management
```

### Design Patterns

1. **Service Layer Pattern:** Business logic in `services.py` files
2. **Repository Pattern (Optional):** Data access abstraction
3. **Factory Pattern:** For creating checklist instances
4. **Strategy Pattern:** For different placeholder types
5. **Observer Pattern:** For notifications (future)
6. **Singleton:** For shared configurations (careful use)

### Key Design Principles

- **DRY (Don't Repeat Yourself):** Reuse components across apps
- **KISS (Keep It Simple, Stupid):** Simple solutions over complex ones
- **SOLID:**
  - **S**ingle Responsibility: Each class has one reason to change
  - **O**pen/Closed: Open for extension, closed for modification
  - **L**iskov Substitution: Subtypes must be substitutable
  - **I**nterface Segregation: Many small interfaces
  - **D**ependency Inversion: Depend on abstractions
- **Explicit over Implicit:** Clear, readable code
- **Loose Coupling, High Cohesion:** Independent modules, focused components

---

## Data Model

### ER Diagram Overview

```
User (1) ----< (N) ChecklistTemplate
User (1) ----< (N) TodoList
User (1) ----< (N) Folder
User (1) ----< (N) Tag
User (1) ----< (N) Group
User (1) ----< (N) Assignment
User (1) ----< (N) Webhook
User (1) ----< (N) CommunityTemplate

Group (M) ----< (N) User
Group (1) ----< (N) Assignment

ChecklistTemplate (1) ----< (N) ChecklistVersion
ChecklistTemplate (1) ----< (N) ChecklistInstance
ChecklistTemplate (M) ----< (N) Tag
ChecklistTemplate (1) ----< (N) Folder
ChecklistTemplate (1) ----< (N) Assignment
ChecklistTemplate (1) ----< (N) RunLink
ChecklistTemplate (1) ----< (N) DynamicDueDateRule
ChecklistTemplate (1) ----< (N) NotificationRule

ChecklistVersion (1) ----< (N) ChecklistItem

ChecklistInstance (1) ----< (N) ChecklistItemInstance
ChecklistInstance (1) ----< (N) Assignment (runtime)
ChecklistInstance (1) ----< (N) AuditLog

ChecklistItem (1) ----< (1) Placeholder
ChecklistItem (1) ----< (N) Assignment (template)
ChecklistItem (1) ----< (N) DynamicDueDateRule
ChecklistItem (1) ----< (N) NotificationRule
Placeholder (1) ----< (N) PlaceholderOption

TodoList (M) ----< (N) TodoItem
TodoList (M) ----< (N) Tag
TodoList (1) ----< (N) Folder
TodoList (1) ----< (N) Assignment

CalendarEvent (1) ----< (N) ChecklistTemplate (optional)
CalendarEvent (1) ----< (N) TodoList (optional)
CalendarEvent (1) ----< (N) ChecklistInstance (created)

Assignment (1) ----< (N) ChecklistItemInstance
Assignment (1) ----< (N) NotificationRule

Webhook (1) ----< (N) WebhookEvent

NotificationRule (1) ----< (N) NotificationSequence

AuditLog (1) ----< (1) User
AuditLog (1) ----< (1) ChecklistInstance

CommunityTemplate (1) ----< (1) ChecklistTemplate
CommunityTemplate (1) ----< (1) User (author)
CommunityTemplate (M) ----< (N) User (downloaders)
```

### Detailed Models

#### 1. Core Models

```python
class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
```

#### 2. Users (Django User Extension)

```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    notification_preferences = models.JSONField(default=dict)
    ldap_dn = models.CharField(max_length=255, blank=True)  # LDAP Distinguished Name
    employee_id = models.CharField(max_length=50, blank=True)  # Corporate ID
    department = models.CharField(max_length=100, blank=True)
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')

    def __str__(self):
        return f"{self.user.username}'s profile"


class Group(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    ldap_group_dn = models.CharField(max_length=255, blank=True)  # Sync with LDAP groups
    members = models.ManyToManyField(User, through='GroupMembership', related_name='groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class GroupMembership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[('member', 'Member'), ('owner', 'Owner')], default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'group']
```

#### 3. Tags

```python
class Tag(TimestampedModel):
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#3498db')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tags')
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name
```

#### 4. Folders

```python
class Folder(TimestampedModel):
    name = models.CharField(max_length=200)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    icon = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name
```

#### 5. Checklist Templates

```python
class ChecklistTemplate(TimestampedModel, SoftDeleteModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checklist_templates')
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name='checklist')
    tags = models.ManyToManyField(Tag, blank=True, related_name='checklist_templates')
    current_version = models.ForeignKey('ChecklistVersion', on_delete=models.SET_NULL, null=True, blank=True, related_name='current_for_template')
    sequential_mode = models.BooleanField(default=False)  # Strict order or free-form
    icon = models.CharField(max_length=50, blank=True)
    is_favorite = models.BooleanField(default=False)
    estimated_duration = models.DurationField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

#### 6. Checklist Versions

```python
class ChecklistVersion(TimestampedModel):
    template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    changelog = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)  # One per template

    class Meta:
        ordering = ['-version_number']
        unique_together = ['template', 'version_number']

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"
```

#### 7. Checklist Items

```python
class ChecklistItem(TimestampedModel):
    version = models.ForeignKey(ChecklistVersion, on_delete=models.CASCADE, related_name='items')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)
    priority = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium')
    placeholder = models.ForeignKey('Placeholder', on_delete=models.SET_NULL, null=True, blank=True, related_name='items')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title
```

#### 8. Placeholders

```python
class Placeholder(TimestampedModel):
    TYPE_CHOICES = [
        ('dropdown', 'Dropdown'),
        ('text', 'Text Input'),
        ('date', 'Date Picker'),
        ('number', 'Number Input'),
        ('checkbox', 'Checkbox'),
    ]

    name = models.CharField(max_length=100)
    placeholder_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    is_required = models.BooleanField(default=True)
    default_value = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.placeholder_type}: {self.name}"
```

#### 9. Placeholder Options

```python
class PlaceholderOption(TimestampedModel):
    placeholder = models.ForeignKey(Placeholder, on_delete=models.CASCADE, related_name='options')
    value = models.CharField(max_length=200)
    display_text = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.display_text
```

#### 10. Checklist Instances

```python
class ChecklistInstance(TimestampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('paused', 'Paused'),
    ]

    template = models.ForeignKey(ChecklistTemplate, on_delete=models.SET_NULL, null=True, related_name='instances')
    version = models.ForeignKey(ChecklistVersion, on_delete=models.SET_NULL, null=True, related_name='instances')
    name = models.CharField(max_length=200)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checklist_instances')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    progress_percentage = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    calendar_event = models.ForeignKey('CalendarEvent', on_delete=models.SET_NULL, null=True, blank=True, related_name='instances')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

#### 11. Checklist Item Instances

```python
class ChecklistItemInstance(TimestampedModel):
    instance = models.ForeignKey(ChecklistInstance, on_delete=models.CASCADE, related_name='item_instances')
    item = models.ForeignKey(ChecklistItem, on_delete=models.SET_NULL, null=True, related_name='instances')
    title = models.CharField(max_length=500)  # Copy from item, editable
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    placeholder_value = models.CharField(max_length=200, blank=True)  # User's choice
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    is_visible = models.BooleanField(default=True)  # Controlled by placeholder logic

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title
```

#### 12. Completion Logs

```python
class CompletionLog(TimestampedModel):
    instance = models.ForeignKey(ChecklistInstance, on_delete=models.CASCADE, related_name='completion_logs')
    item_instance = models.ForeignKey(ChecklistItemInstance, on_delete=models.CASCADE, related_name='completion_logs')
    action = models.CharField(max_length=50)  # 'completed', 'uncompleted', 'skipped'
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.item_instance.title} - {self.action}"
```

#### 13. Todo Lists

```python
class TodoList(TimestampedModel, SoftDeleteModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todo_lists')
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name='todos')
    tags = models.ManyToManyField(Tag, blank=True, related_name='todo_lists')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium')
    icon = models.CharField(max_length=50, blank=True)
    is_favorite = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

#### 14. Todo Items

```python
class TodoItem(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    todo_list = models.ForeignKey(TodoList, on_delete=models.CASCADE, related_name='items')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order = models.PositiveIntegerField(default=0)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title
```

#### 15. Calendar Events

```python
class CalendarEvent(TimestampedModel):
    TYPE_CHOICES = [
        ('checklist', 'Checklist'),
        ('todo', 'Todo'),
        ('custom', 'Custom'),
    ]

    RECURRENCE_CHOICES = [
        ('once', 'Once'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom'),
    ]

    title = models.CharField(max_length=200)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_events')
    event_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    checklist_template = models.ForeignKey(ChecklistTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='calendar_events')
    todo_list = models.ForeignKey(TodoList, on_delete=models.SET_NULL, null=True, blank=True, related_name='calendar_events')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='once')
    recurrence_rule = models.JSONField(null=True, blank=True)  # iCal RRULE format
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db')
    reminder_minutes_before = models.PositiveIntegerField(null=True, blank=True)
    template_presets = models.JSONField(null=True, blank=True)  # Pre-filled values for template
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['start_datetime']

    def __str__(self):
        return self.title
```

#### 16. Statistics Aggregated Tables (Optional - for performance)

```python
class ChecklistUsageStats(TimestampedModel):
    template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, related_name='usage_stats')
    date = models.DateField()
    instances_created = models.PositiveIntegerField(default=0)
    instances_completed = models.PositiveIntegerField(default=0)
    avg_completion_time_seconds = models.PositiveIntegerField(null=True, blank=True)
    avg_completion_percentage = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ['template', 'date']
```

#### 17. Assignments (Auto-Assignments)

```python
class Assignment(TimestampedModel):
    TYPE_CHOICES = [
        ('template', 'Template Level'),
        ('item', 'Item Level'),
        ('runtime', 'Runtime Instance'),
    ]

    ASSIGNMENT_TYPE_CHOICES = [
        ('user', 'Specific User'),
        ('group', 'Group'),
        ('parameter', 'Parameter/Placeholder'),
        ('manager', 'User\'s Manager'),
    ]

    assignment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    checklist_template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, null=True, blank=True, related_name='assignments')
    checklist_item = models.ForeignKey(ChecklistItem, on_delete=models.CASCADE, null=True, blank=True, related_name='assignments')
    checklist_instance = models.ForeignKey(ChecklistInstance, on_delete=models.CASCADE, null=True, blank=True, related_name='runtime_assignments')
    assignee_type = models.CharField(max_length=20, choices=ASSIGNMENT_TYPE_CHOICES)
    assignee_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='task_assignments')
    assignee_group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='task_assignments')
    assignee_parameter = models.CharField(max_length=100, blank=True)  # Reference to parameter/placeholder
    is_exclusive = models.BooleanField(default=False)  # Only assignee can complete the task
    auto_notify = models.BooleanField(default=True)  # Send notification on assignment

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.assignment_type} assignment for {self.get_assignee_display()}"
```

#### 18. Run Links (One-Click Creation)

```python
class RunLink(TimestampedModel):
    ACCESS_TYPE_CHOICES = [
        ('public', 'Public - Anyone with link'),
        ('team', 'Team Members Only'),
        ('private', 'Private - Authenticated Users Only'),
    ]

    checklist_template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, related_name='run_links')
    unique_id = models.UUIDField(unique=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPE_CHOICES, default='public')
    preset_values = models.JSONField(default=dict)  # Pre-filled parameters
    expires_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)  # Limit number of times link can be used
    usage_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_run_links')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def get_url(self):
        return f"/run/{self.unique_id}"
```

#### 19. Dynamic Due Dates

```python
class DynamicDueDateRule(TimestampedModel):
    TRIGGER_TYPE_CHOICES = [
        ('checklist_start', 'Checklist Start Date'),
        ('item_completion', 'Previous Item Completion'),
        ('parameter_value', 'Parameter/Placeholder Value'),
        ('calendar_event', 'Calendar Event Date'),
    ]

    checklist_template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, null=True, blank=True, related_name='due_date_rules')
    checklist_item = models.ForeignKey(ChecklistItem, on_delete=models.CASCADE, null=True, blank=True, related_name='due_date_rules')
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_TYPE_CHOICES)
    trigger_item_id = models.PositiveIntegerField(null=True, blank=True)  # For item_completion trigger
    trigger_parameter_name = models.CharField(max_length=100, blank=True)  # For parameter_value trigger
    offset_minutes = models.IntegerField(default=0)  # Positive for after, negative for before
    business_days_only = models.BooleanField(default=False)  # Skip weekends and holidays
    calendar_id = models.PositiveIntegerField(null=True, blank=True)  # For calendar_event trigger

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Due date rule: {self.get_trigger_type_display()}"
```

#### 20. Notifications (Advanced Multi-Level Sequences)

```python
class NotificationRule(TimestampedModel):
    EVENT_CHOICES = [
        ('task_due_in', 'Task Is Due In'),
        ('task_overdue_by', 'Task Is Overdue By'),
        ('task_completed', 'Task Completed'),
        ('task_status_changed', 'Task Status Changed'),
        ('checklist_completed', 'Checklist Completed'),
        ('task_assigned', 'Task Assigned'),
    ]

    checklist_template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, null=True, blank=True, related_name='notification_rules')
    checklist_item = models.ForeignKey(ChecklistItem, on_delete=models.CASCADE, null=True, blank=True, related_name='notification_rules')
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, null=True, blank=True, related_name='notification_rules')
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification: {self.get_event_type_display()}"


class NotificationSequence(TimestampedModel):
    notification_rule = models.ForeignKey(NotificationRule, on_delete=models.CASCADE, related_name='sequences')
    sequence_order = models.PositiveIntegerField(default=0)
    trigger_offset_minutes = models.IntegerField()  # Offset from event time
    recipient_type = models.CharField(max_length=20, choices=[('assignee', 'Assignee'), ('group', 'Group'), ('custom', 'Custom Email')])
    recipient_group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name='notification_sequences')
    custom_email = models.EmailField(blank=True)
    email_subject = models.CharField(max_length=200, blank=True)
    email_body = models.TextField(blank=True)
    template_id = models.CharField(max_length=50, blank=True)  # Email template ID

    class Meta:
        ordering = ['sequence_order']

    def __str__(self):
        return f"Sequence {self.sequence_order}: {self.trigger_offset_minutes}min"


class NotificationLog(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    notification_sequence = models.ForeignKey(NotificationSequence, on_delete=models.CASCADE, related_name='logs')
    checklist_instance = models.ForeignKey(ChecklistInstance, on_delete=models.CASCADE, related_name='notification_logs')
    recipient_email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"Notification to {self.recipient_email}: {self.status}"
```

#### 21. Webhooks

```python
class Webhook(TimestampedModel):
    EVENT_CHOICES = [
        ('checklist_created', 'Checklist Instance Created'),
        ('checklist_started', 'Checklist Instance Started'),
        ('checklist_completed', 'Checklist Instance Completed'),
        ('item_completed', 'Checklist Item Completed'),
        ('item_failed', 'Checklist Item Failed'),
        ('user_assigned', 'User Assigned to Task'),
        ('due_date_passed', 'Due Date Passed'),
    ]

    name = models.CharField(max_length=200)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webhooks')
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    endpoint_url = models.URLField(max_length=500)
    secret = models.CharField(max_length=100, blank=True)  # For HMAC signature verification
    is_active = models.BooleanField(default=True)
    headers = models.JSONField(default=dict)  # Custom headers

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class WebhookEvent(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]

    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='events')
    checklist_instance = models.ForeignKey(ChecklistInstance, on_delete=models.SET_NULL, null=True, blank=True, related_name='webhook_events')
    event_type = models.CharField(max_length=30)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    response_code = models.PositiveIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Webhook event: {self.event_type} - {self.status}"
```

#### 22. Advanced Audit Trail

```python
class AuditLog(TimestampedModel):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('assigned', 'Assigned'),
        ('unassigned', 'Unassigned'),
        ('exported', 'Exported'),
        ('imported', 'Imported'),
    ]

    ENTITY_CHOICES = [
        ('checklist_template', 'Checklist Template'),
        ('checklist_version', 'Checklist Version'),
        ('checklist_instance', 'Checklist Instance'),
        ('checklist_item', 'Checklist Item'),
        ('todo_list', 'Todo List'),
        ('todo_item', 'Todo Item'),
        ('folder', 'Folder'),
        ('tag', 'Tag'),
        ('user', 'User'),
        ('group', 'Group'),
        ('assignment', 'Assignment'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=30, choices=ENTITY_CHOICES)
    entity_id = models.PositiveIntegerField()
    entity_name = models.CharField(max_length=200, blank=True)
    checklist_instance = models.ForeignKey(ChecklistInstance, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    changes = models.JSONField(default=dict)  # Before/after values
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    additional_data = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['checklist_instance']),
        ]

    def __str__(self):
        return f"{self.action} {self.entity_type}: {self.entity_name}"
```

#### 23. Halt Tasks (Enforced Order)

```python
class ChecklistItem(models.Model):
    # ... existing fields ...
    is_halt = models.BooleanField(default=False)  # Blocks subsequent items until completed
    halt_message = models.CharField(max_length=500, blank=True)  # Message shown when blocked
```

#### 24. Template Library (Community)

```python
class CommunityTemplate(TimestampedModel):
    CATEGORY_CHOICES = [
        ('devops', 'DevOps'),
        ('qa', 'Quality Assurance'),
        ('hr', 'Human Resources'),
        ('finance', 'Finance'),
        ('marketing', 'Marketing'),
        ('operations', 'Operations'),
        ('compliance', 'Compliance'),
        ('general', 'General'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    checklist_template = models.OneToOneField(ChecklistTemplate, on_delete=models.CASCADE, related_name='community_template')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='published_templates')
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    tags = models.JSONField(default=list)  # Community tags
    download_count = models.PositiveIntegerField(default=0)
    rating = models.FloatField(default=0.0)
    rating_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_templates')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-is_featured', '-rating', '-download_count', '-published_at']

    def __str__(self):
        return self.name


class TemplateRating(TimestampedModel):
    community_template = models.ForeignKey(CommunityTemplate, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='template_ratings')
    rating = models.PositiveIntegerField(choices=[(1, '1 Star'), (2, '2 Stars'), (3, '3 Stars'), (4, '4 Stars'), (5, '5 Stars')])
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ['community_template', 'user']

    def __str__(self):
        return f"{self.user.username} rated {self.rating} stars"
```

---

## API Endpoints

### Base URL
- Production: `https://api.checkix.com/v1/`
- Development: `http://localhost:8000/api/v1/`

### Authentication

#### POST `/auth/token/`
**Description:** Obtain JWT access and refresh tokens.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access": "string",
  "refresh": "string"
}
```

#### POST `/auth/token/refresh/`
**Description:** Refresh access token.

**Request:**
```json
{
  "refresh": "string"
}
```

**Response:**
```json
{
  "access": "string"
}
```

---

### Users

#### GET `/users/me/`
**Description:** Get current user profile.

**Response:**
```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "profile": {
    "timezone": "UTC",
    "language": "en",
    "notification_preferences": {}
  }
}
```

#### PUT `/users/me/`
**Description:** Update current user profile.

**Request:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "profile": {
    "timezone": "America/New_York",
    "language": "en"
  }
}
```

---

### Tags

#### GET `/tags/`
**Description:** List all tags for authenticated user.

**Query Parameters:**
- `search`: string (optional)
- `page`: integer (default: 1)
- `page_size`: integer (default: 20)

**Response:**
```json
{
  "count": 10,
  "next": "string",
  "previous": "string",
  "results": [
    {
      "id": 1,
      "name": "Deployment",
      "color": "#3498db",
      "description": "Deployment related tasks",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/tags/`
**Description:** Create a new tag.

**Request:**
```json
{
  "name": "Testing",
  "color": "#e74c3c",
  "description": "Quality assurance tasks"
}
```

#### GET `/tags/{id}/`
**Description:** Retrieve a specific tag.

#### PUT `/tags/{id}/`
**Description:** Update a tag.

#### DELETE `/tags/{id}/`
**Description:** Delete a tag (soft delete).

---

### Folders

#### GET `/folders/`
**Description:** List all folders (tree structure).

**Query Parameters:**
- `parent_id`: integer (optional - filter by parent)
- `search`: string (optional)

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "name": "DevOps",
      "parent": null,
      "icon": "folder",
      "order": 1,
      "children": [
        {
          "id": 2,
          "name": "Deployment",
          "parent": 1,
          "icon": "folder",
          "order": 1
        }
      ]
    }
  ]
}
```

#### POST `/folders/`
**Description:** Create a new folder.

**Request:**
```json
{
  "name": "QA",
  "parent_id": null,
  "icon": "folder",
  "order": 2
}
```

#### PUT `/folders/{id}/`
**Description:** Update a folder.

#### DELETE `/folders/{id}/`
**Description:** Delete a folder (soft delete).

---

### Checklist Templates

#### GET `/checklists/`
**Description:** List all checklist templates.

**Query Parameters:**
- `folder_id`: integer (optional)
- `tag_id`: integer (optional)
- `search`: string (optional)
- `is_favorite`: boolean (optional)
- `sequential_mode`: boolean (optional)
- `page`: integer
- `page_size`: integer

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "id": 1,
      "name": "Service Deployment",
      "description": "Standard deployment procedure",
      "folder": {"id": 2, "name": "Deployment"},
      "tags": [{"id": 1, "name": "DevOps", "color": "#3498db"}],
      "current_version": {"id": 1, "version_number": 3, "changelog": "Added rollback step"},
      "sequential_mode": true,
      "icon": "rocket",
      "is_favorite": true,
      "estimated_duration": "01:30:00",
      "stats": {
        "total_instances": 42,
        "completed_instances": 38,
        "avg_completion_time_minutes": 95,
        "usage_frequency": "high"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/checklists/`
**Description:** Create a new checklist template.

**Request:**
```json
{
  "name": "API Testing",
  "description": "Comprehensive API testing checklist",
  "folder_id": 3,
  "tag_ids": [4, 5],
  "sequential_mode": false,
  "icon": "check-circle",
  "estimated_duration": "00:45:00",
  "initial_version": {
    "changelog": "Initial version",
    "items": [
      {
        "title": "Authentication",
        "description": "Test authentication endpoints",
        "order": 1,
        "is_required": true,
        "priority": "high",
        "placeholder": null,
        "children": []
      },
      {
        "title": "Environment Setup",
        "description": "Configure test environment",
        "order": 2,
        "is_required": true,
        "priority": "medium",
        "placeholder": {
          "name": "Environment",
          "placeholder_type": "dropdown",
          "is_required": true,
          "options": [
            {"value": "dev", "display_text": "Development", "order": 1},
            {"value": "staging", "display_text": "Staging", "order": 2},
            {"value": "prod", "display_text": "Production", "order": 3}
          ]
        },
        "children": [
          {
            "title": "Dev Environment Setup",
            "description": "Specific steps for dev",
            "order": 1,
            "placeholder_condition": {"field": "Environment", "value": "dev"}
          }
        ]
      }
    ]
  }
}
```

#### GET `/checklists/{id}/`
**Description:** Retrieve a checklist template with full version details.

#### PUT `/checklists/{id}/`
**Description:** Update checklist template metadata.

#### DELETE `/checklists/{id}/`
**Description:** Soft delete checklist template.

---

### Checklist Versions

#### GET `/checklists/{id}/versions/`
**Description:** List all versions of a checklist template.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "version_number": 1,
      "changelog": "Initial version",
      "is_active": false,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "version_number": 2,
      "changelog": "Added performance tests",
      "is_active": true,
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

#### POST `/checklists/{id}/versions/`
**Description:** Create a new version (snapshot of items).

**Request:**
```json
{
  "changelog": "Added new test cases for edge cases",
  "copy_from_version_id": 2
}
```

#### PUT `/checklists/{id}/versions/{version_id}/`
**Description:** Update version details.

#### POST `/checklists/{id}/versions/{version_id}/set-active/`
**Description:** Set this version as the current active version.

#### GET `/checklists/{id}/versions/{version_id}/items/`
**Description:** Get all items in a specific version.

---

### Checklist Instances

#### GET `/checklist-instances/`
**Description:** List checklist instances.

**Query Parameters:**
- `template_id`: integer (optional)
- `status`: string (draft|in_progress|completed|cancelled|paused)
- `search`: string (optional)
- `date_from`: date (optional)
- `date_to`: date (optional)

**Response:**
```json
{
  "count": 25,
  "results": [
    {
      "id": 1,
      "template": {"id": 1, "name": "Service Deployment"},
      "version": {"id": 2, "version_number": 2},
      "name": "Deploy to Production - Jan 15",
      "status": "completed",
      "started_at": "2024-01-15T10:00:00Z",
      "completed_at": "2024-01-15T11:45:00Z",
      "progress_percentage": 100,
      "notes": "Smooth deployment",
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

#### POST `/checklist-instances/`
**Description:** Create a new instance from a template.

**Request:**
```json
{
  "template_id": 1,
  "name": "Deploy to Staging",
  "notes": "Testing new features"
}
```

#### GET `/checklist-instances/{id}/`
**Description:** Retrieve instance with all items.

**Response:**
```json
{
  "id": 1,
  "template": {"id": 1, "name": "Service Deployment"},
  "version": {"id": 2, "version_number": 2},
  "name": "Deploy to Staging",
  "status": "in_progress",
  "started_at": "2024-01-15T10:00:00Z",
  "progress_percentage": 60,
  "notes": "",
  "items": [
    {
      "id": 1,
      "item_id": 5,
      "title": "Pre-deployment checks",
      "description": "Verify system readiness",
      "order": 1,
      "is_completed": true,
      "completed_at": "2024-01-15T10:15:00Z",
      "placeholder_value": null,
      "is_visible": true,
      "children": []
    },
    {
      "id": 2,
      "item_id": 6,
      "title": "Database migration",
      "description": "Run migration scripts",
      "order": 2,
      "is_completed": true,
      "completed_at": "2024-01-15T10:30:00Z",
      "placeholder_value": null,
      "is_visible": true,
      "children": []
    },
    {
      "id": 3,
      "item_id": 7,
      "title": "Deploy to servers",
      "description": "Choose deployment target",
      "order": 3,
      "is_completed": false,
      "placeholder_value": "staging",
      "is_visible": true,
      "children": [
        {
          "id": 4,
          "title": "Deploy to staging server",
          "is_completed": false,
          "is_visible": true
        }
      ]
    }
  ]
}
```

#### PUT `/checklist-instances/{id}/`
**Description:** Update instance metadata.

#### POST `/checklist-instances/{id}/start/`
**Description:** Start the instance execution.

#### POST `/checklist-instances/{id}/complete/`
**Description:** Mark instance as completed.

#### POST `/checklist-instances/{id}/pause/`
**Description:** Pause instance execution.

#### POST `/checklist-instances/{id}/cancel/`
**Description:** Cancel instance execution.

#### PUT `/checklist-instances/{id}/items/{item_id}/`
**Description:** Update an item instance.

**Request:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "is_completed": true
}
```

#### PUT `/checklist-instances/{id}/items/{item_id}/placeholder-value/`
**Description:** Update placeholder value (triggers visibility logic).

**Request:**
```json
{
  "value": "staging"
}
```

#### POST `/checklist-instances/{id}/apply-to-template/`
**Description:** Apply instance changes back to template (with version update).

**Request:**
```json
{
  "version_changelog": "Updated based on instance feedback"
}
```

---

### Todo Lists

#### GET `/todos/`
**Description:** List all todo lists.

**Query Parameters:**
- `folder_id`: integer (optional)
- `tag_id`: integer (optional)
- `status`: string (active|completed|cancelled)
- `search`: string (optional)

**Response:**
```json
{
  "count": 8,
  "results": [
    {
      "id": 1,
      "name": "Quarterly Planning",
      "description": "Plan Q1 objectives",
      "folder": {"id": 4, "name": "Planning"},
      "tags": [{"id": 3, "name": "Strategy", "color": "#9b59b6"}],
      "status": "active",
      "due_date": "2024-02-01T18:00:00Z",
      "priority": "high",
      "icon": "calendar",
      "is_favorite": false,
      "items_count": 5,
      "completed_items_count": 2
    }
  ]
}
```

#### POST `/todos/`
**Description:** Create a new todo list.

**Request:**
```json
{
  "name": "Weekly Sprint Review",
  "description": "Review completed tasks",
  "folder_id": 4,
  "tag_ids": [3],
  "due_date": "2024-02-01T18:00:00Z",
  "priority": "medium",
  "icon": "clipboard",
  "items": [
    {
      "title": "Review PRs",
      "description": "Check merged pull requests",
      "order": 1,
      "priority": "high"
    },
    {
      "title": "Team standup",
      "order": 2,
      "priority": "medium"
    }
  ]
}
```

#### GET `/todos/{id}/`
**Description:** Retrieve todo list with items.

**Response:**
```json
{
  "id": 1,
  "name": "Weekly Sprint Review",
  "description": "Review completed tasks",
  "status": "active",
  "due_date": "2024-02-01T18:00:00Z",
  "priority": "medium",
  "items": [
    {
      "id": 1,
      "title": "Review PRs",
      "description": "Check merged pull requests",
      "status": "completed",
      "order": 1,
      "due_date": null,
      "completed_at": "2024-01-20T14:30:00Z",
      "priority": "high"
    },
    {
      "id": 2,
      "title": "Team standup",
      "status": "pending",
      "order": 2,
      "due_date": "2024-02-01T10:00:00Z",
      "priority": "medium"
    }
  ]
}
```

#### PUT `/todos/{id}/`
**Description:** Update todo list.

#### DELETE `/todos/{id}/`
**Description:** Soft delete todo list.

#### POST `/todos/{id}/complete/`
**Description:** Mark todo list as completed.

#### POST `/todos/{id}/convert-to-checklist/`
**Description:** Convert todo list to checklist template.

**Request:**
```json
{
  "template_name": "Weekly Sprint Review Template",
  "changelog": "Converted from todo list"
}
```

**Response:**
```json
{
  "template_id": 5,
  "message": "Successfully converted to checklist template"
}
```

#### POST `/todos/{id}/items/`
**Description:** Add item to todo list.

#### PUT `/todos/{id}/items/{item_id}/`
**Description:** Update todo item.

#### DELETE `/todos/{id}/items/{item_id}/`
**Description:** Delete todo item.

---

### Calendar

#### GET `/calendar/events/`
**Description:** List calendar events.

**Query Parameters:**
- `start_date`: date (required)
- `end_date`: date (required)
- `event_type`: string (checklist|todo|custom) (optional)
- `status`: string (upcoming|completed|cancelled) (optional)

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "title": "Deploy to Production",
      "event_type": "checklist",
      "checklist_template": {
        "id": 1,
        "name": "Service Deployment",
        "estimated_duration": "01:30:00"
      },
      "start_datetime": "2024-01-20T10:00:00Z",
      "end_datetime": "2024-01-20T11:30:00Z",
      "all_day": false,
      "recurrence": "once",
      "location": "Main Server",
      "description": "Monthly production deployment",
      "color": "#3498db",
      "reminder_minutes_before": 15,
      "template_presets": {
        "environment": "production",
        "backup_before": true
      },
      "is_completed": false,
      "created_at": "2024-01-15T00:00:00Z"
    },
    {
      "id": 2,
      "title": "Sprint Planning",
      "event_type": "todo",
      "todo_list": {
        "id": 1,
        "name": "Weekly Sprint Review"
      },
      "start_datetime": "2024-01-21T09:00:00Z",
      "end_datetime": "2024-01-21T10:00:00Z",
      "all_day": false,
      "recurrence": "weekly",
      "color": "#9b59b6",
      "is_completed": false
    }
  ]
}
```

#### POST `/calendar/events/`
**Description:** Create a new calendar event.

**Request (Checklist):**
```json
{
  "title": "Deploy to Staging",
  "event_type": "checklist",
  "checklist_template_id": 1,
  "start_datetime": "2024-01-20T14:00:00Z",
  "end_datetime": "2024-01-20T15:30:00Z",
  "all_day": false,
  "recurrence": "once",
  "location": "Staging Server",
  "description": "Test deployment",
  "color": "#3498db",
  "reminder_minutes_before": 30,
  "template_presets": {
    "environment": "staging",
    "run_tests": true
  }
}
```

**Request (Todo):**
```json
{
  "title": "Team Meeting",
  "event_type": "todo",
  "todo_list_id": 1,
  "start_datetime": "2024-01-21T09:00:00Z",
  "end_datetime": "2024-01-21T10:00:00Z",
  "recurrence": "weekly",
  "recurrence_rule": {
    "frequency": "WEEKLY",
    "by_day": ["MO"]
  }
}
```

#### GET `/calendar/events/{id}/`
**Description:** Retrieve a specific calendar event.

#### PUT `/calendar/events/{id}/`
**Description:** Update a calendar event.

#### DELETE `/calendar/events/{id}/`
**Description:** Delete a calendar event.

#### PUT `/calendar/events/{id}/reschedule/`
**Description:** Reschedule event to new date/time.

**Request:**
```json
{
  "new_start_datetime": "2024-01-22T14:00:00Z",
  "new_end_datetime": "2024-01-22T15:30:00Z"
}
```

#### POST `/calendar/events/{id}/complete/`
**Description:** Mark event as completed.

---

### Statistics

#### GET `/stats/overview/`
**Description:** Get overall statistics overview.

**Query Parameters:**
- `date_from`: date (optional - default: 30 days ago)
- `date_to`: date (optional - default: today)

**Response:**
```json
{
  "checklists": {
    "total_templates": 15,
    "active_templates": 12,
    "total_instances": 142,
    "completed_instances": 128,
    "in_progress_instances": 10,
    "avg_completion_time_minutes": 87,
    "completion_rate": 90.1
  },
  "todos": {
    "total_lists": 45,
    "active_lists": 8,
    "completed_lists": 37,
    "total_items": 234,
    "completed_items": 201,
    "completion_rate": 85.9
  },
  "calendar": {
    "total_events": 28,
    "upcoming_events": 5,
    "completed_events": 23,
    "this_week_events": 3
  },
  "activity": {
    "total_tasks_completed": 329,
    "avg_tasks_per_day": 10.9,
    "most_productive_day": "Wednesday",
    "peak_hour": "10:00"
  }
}
```

#### GET `/stats/checklists/`
**Description:** Get checklist-specific statistics.

**Query Parameters:**
- `template_id`: integer (optional - for specific template)
- `date_from`: date (optional)
- `date_to`: date (optional)

**Response:**
```json
{
  "template_id": 1,
  "template_name": "Service Deployment",
  "usage": {
    "total_instances": 42,
    "completed_instances": 38,
    "in_progress_instances": 2,
    "avg_completion_time_minutes": 95,
    "completion_rate": 90.5
  },
  "items_stats": [
    {
      "item_title": "Pre-deployment checks",
      "completion_rate": 100,
      "avg_time_to_complete_minutes": 15
    },
    {
      "item_title": "Database migration",
      "completion_rate": 95,
      "avg_time_to_complete_minutes": 25
    }
  ],
  "timeline": [
    {
      "date": "2024-01-01",
      "instances_created": 3,
      "instances_completed": 2
    },
    {
      "date": "2024-01-02",
      "instances_created": 1,
      "instances_completed": 1
    }
  ]
}
```

#### GET `/stats/templates-ranking/`
**Description:** Get ranking of templates by usage frequency.

**Query Parameters:**
- `limit`: integer (default: 10)
- `period`: string (week|month|year) (default: month)

**Response:**
```json
{
  "ranking": [
    {
      "template_id": 1,
      "template_name": "Service Deployment",
      "instances_count": 42,
      "completion_rate": 90.5,
      "avg_completion_time_minutes": 95,
      "rank": 1
    },
    {
      "template_id": 3,
      "template_name": "Bug Investigation",
      "instances_count": 28,
      "completion_rate": 85.7,
      "avg_completion_time_minutes": 45,
      "rank": 2
    }
  ]
}
```

#### GET `/stats/heatmap/`
**Description:** Get activity heatmap data.

**Query Parameters:**
- `type`: string (checklist|todo|all) (default: all)
- `date_from`: date (optional)
- `date_to`: date (optional)

**Response:**
```json
{
  "heatmap_data": [
    {
      "date": "2024-01-01",
      "day_of_week": "Monday",
      "tasks_completed": 12,
      "intensity": 3
    },
    {
      "date": "2024-01-02",
      "day_of_week": "Tuesday",
      "tasks_completed": 18,
      "intensity": 4
    }
  ]
}
```

#### GET `/stats/productivity-report/`
**Description:** Get detailed productivity report.

**Response:**
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "summary": {
    "total_tasks": 329,
    "completed_tasks": 301,
    "completion_rate": 91.5,
    "avg_completion_time_minutes": 82
  },
  "by_day": [
    {
      "day": "Monday",
      "tasks_completed": 65,
      "percentage": 21.6
    },
    {
      "day": "Tuesday",
      "tasks_completed": 58,
      "percentage": 19.3
    }
  ],
  "by_hour": [
    {
      "hour": 9,
      "tasks_completed": 35,
      "percentage": 11.6
    },
    {
      "hour": 10,
      "tasks_completed": 52,
      "percentage": 17.3
    }
  ]
}
```

---

### Search

#### GET `/search/`
**Description:** Global search across all resources.

**Query Parameters:**
- `query`: string (required)
- `type`: string (checklist|todo|folder|tag) (optional)
- `page`: integer

**Response:**
```json
{
  "results": {
    "checklists": [
      {
        "id": 1,
        "name": "Service Deployment",
        "description": "Standard deployment procedure",
        "type": "checklist"
      }
    ],
    "todos": [
      {
        "id": 3,
        "name": "Quarterly Planning",
        "type": "todo"
      }
    ],
    "folders": [
      {
        "id": 1,
        "name": "DevOps",
        "type": "folder"
      }
    ],
    "tags": [
      {
        "id": 1,
        "name": "Deployment",
        "type": "tag"
      }
    ]
  }
}
```

---

### Assignments

#### GET `/assignments/`
**Description:** List all assignments.

**Query Parameters:**
- `checklist_template_id`: integer (optional)
- `checklist_instance_id`: integer (optional)
- `assignee_type`: string (user|group) (optional)
- `user_id`: integer (optional)
- `page`: integer

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "id": 1,
      "assignment_type": "item",
      "checklist_item": {"id": 5, "title": "Deployment Task"},
      "assignee_type": "user",
      "assignee_user": {"id": 2, "username": "john.doe"},
      "is_exclusive": true,
      "auto_notify": true
    }
  ]
}
```

#### POST `/assignments/`
**Description:** Create a new assignment.

**Request:**
```json
{
  "assignment_type": "item",
  "checklist_template_id": 1,
  "checklist_item_id": 5,
  "assignee_type": "group",
  "assignee_group_id": 3,
  "is_exclusive": false
}
```

#### PUT `/assignments/{id}/`
**Description:** Update an assignment.

#### DELETE `/assignments/{id}/`
**Description:** Delete an assignment.

---

### Run Links

#### GET `/run-links/`
**Description:** List all run links.

**Query Parameters:**
- `checklist_template_id`: integer (optional)
- `access_type`: string (public|team|private) (optional)
- `page`: integer

**Response:**
```json
{
  "count": 8,
  "results": [
    {
      "id": 1,
      "name": "Daily Deployment Link",
      "checklist_template": {"id": 1, "name": "Service Deployment"},
      "access_type": "public",
      "preset_values": {"environment": "production"},
      "expires_at": "2024-12-31T23:59:59Z",
      "max_uses": 100,
      "usage_count": 45,
      "url": "https://app.flowspace.com/run/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  ]
}
```

#### POST `/run-links/`
**Description:** Create a new run link.

**Request:**
```json
{
  "checklist_template_id": 1,
  "name": "Public Deployment Link",
  "access_type": "public",
  "preset_values": {"environment": "staging"},
  "expires_at": "2024-12-31T23:59:59Z",
  "max_uses": 50
}
```

#### POST `/run/{unique_id}/`
**Description:** Create checklist instance from run link.

**Request:**
```json
{
  "preset_overrides": {"run_tests": true}
}
```

#### DELETE `/run-links/{id}/`
**Description:** Delete a run link.

---

### Notifications

#### GET `/notifications/rules/`
**Description:** List all notification rules.

**Query Parameters:**
- `checklist_template_id`: integer (optional)
- `event_type`: string (optional)
- `is_active`: boolean (optional)

**Response:**
```json
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "event_type": "task_due_in",
      "checklist_template": {"id": 1, "name": "Service Deployment"},
      "is_active": true,
      "sequences": [
        {
          "id": 1,
          "sequence_order": 1,
          "trigger_offset_minutes": -1440,
          "recipient_type": "assignee"
        },
        {
          "id": 2,
          "sequence_order": 2,
          "trigger_offset_minutes": -240,
          "recipient_type": "assignee"
        }
      ]
    }
  ]
}
```

#### POST `/notifications/rules/`
**Description:** Create a new notification rule.

**Request:**
```json
{
  "checklist_template_id": 1,
  "event_type": "task_due_in",
  "sequences": [
    {
      "sequence_order": 1,
      "trigger_offset_minutes": -1440,
      "recipient_type": "assignee"
    },
    {
      "sequence_order": 2,
      "trigger_offset_minutes": -240,
      "recipient_type": "assignee"
    }
  ]
}
```

#### PUT `/notifications/rules/{id}/`
**Description:** Update a notification rule.

#### DELETE `/notifications/rules/{id}/`
**Description:** Delete a notification rule.

#### GET `/notifications/logs/`
**Description:** List notification logs.

---

### Webhooks

#### GET `/webhooks/`
**Description:** List all webhooks.

**Query Parameters:**
- `event_type`: string (optional)
- `is_active`: boolean (optional)
- `page`: integer

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "name": "Slack Notifications",
      "event_type": "checklist_completed",
      "endpoint_url": "https://hooks.slack.com/services/XXX",
      "secret": "webhook_secret_123",
      "is_active": true
    }
  ]
}
```

#### POST `/webhooks/`
**Description:** Create a new webhook.

**Request:**
```json
{
  "name": "Slack Integration",
  "event_type": "checklist_completed",
  "endpoint_url": "https://hooks.slack.com/services/XXX",
  "secret": "my_secret_key",
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

#### PUT `/webhooks/{id}/`
**Description:** Update a webhook.

#### DELETE `/webhooks/{id}/`
**Description:** Delete a webhook.

#### GET `/webhooks/{id}/events/`
**Description:** List webhook events.

---

### Audit Logs

#### GET `/audit/logs/`
**Description:** List audit logs.

**Query Parameters:**
- `entity_type`: string (optional)
- `entity_id`: integer (optional)
- `user_id`: integer (optional)
- `action`: string (optional)
- `date_from`: date (optional)
- `date_to`: date (optional)
- `page`: integer

**Response:**
```json
{
  "count": 150,
  "results": [
    {
      "id": 1,
      "user": {"id": 2, "username": "john.doe"},
      "action": "completed",
      "entity_type": "checklist_instance",
      "entity_id": 42,
      "entity_name": "Deploy to Production",
      "checklist_instance": {"id": 42, "name": "Deploy to Production"},
      "changes": {
        "before": {"status": "in_progress"},
        "after": {"status": "completed"}
      },
      "ip_address": "192.168.1.100",
      "timestamp": "2024-01-20T15:30:00Z"
    }
  ]
}
```

#### POST `/audit/logs/export/`
**Description:** Export audit logs.

**Request:**
```json
{
  "format": "csv",
  "date_from": "2024-01-01",
  "date_to": "2024-01-31",
  "filters": {
    "entity_type": "checklist_instance",
    "action": "completed"
  }
}
```

---

### Community Templates

#### GET `/community/templates/`
**Description:** Browse community templates.

**Query Parameters:**
- `category`: string (optional)
- `search`: string (optional)
- `status`: string (optional)
- `is_featured`: boolean (optional)
- `page`: integer

**Response:**
```json
{
  "count": 45,
  "results": [
    {
      "id": 1,
      "name": "Employee Onboarding",
      "description": "Complete new employee onboarding checklist",
      "category": "hr",
      "status": "approved",
      "author": {"id": 3, "username": "admin"},
      "rating": 4.8,
      "rating_count": 25,
      "download_count": 150,
      "is_featured": true,
      "published_at": "2024-01-10T00:00:00Z"
    }
  ]
}
```

#### POST `/community/templates/`
**Description:** Submit a template to the community.

**Request:**
```json
{
  "checklist_template_id": 5,
  "name": "My Custom Checklist",
  "description": "Description of my checklist",
  "category": "devops",
  "tags": ["deployment", "production"]
}
```

#### GET `/community/templates/{id}/`
**Description:** Retrieve a specific community template.

#### POST `/community/templates/{id}/download/`
**Description:** Download a community template.

**Response:**
```json
{
  "template_id": 10,
  "message": "Template imported successfully"
}
```

#### POST `/community/templates/{id}/rate/`
**Description:** Rate a community template.

**Request:**
```json
{
  "rating": 5,
  "comment": "Excellent template!"
}
```

---

## Functional Requirements

### Core Features

#### 1. User Management
- User registration and authentication (JWT-based)
- Profile management (timezone, language, preferences)
- Password reset functionality
- Multi-user support with data isolation
- **LDAP/GPO Integration**
  - Synchronize users from Active Directory/LDAP
  - Auto-import groups and permissions
  - Single Sign-On (SSO) support
  - Group-based access control
  - Manager-subordinate relationships
  - Department and organization structure
- User groups and team management
- Role-based permissions (RBAC)

#### 2. Checklist Templates
- Create, read, update, delete (CRUD) templates
- Template categorization via tags and folders
- Sequential vs. free-form execution modes
- **Enforced Order with Halt Tasks**
  - Set items as "halt" to block subsequent items
  - Halt message display for blocked users
  - Approval workflow support
- Item ordering and nesting (hierarchical items)
- **Auto-Assignments**
  - Template-level assignments (all users)
  - Item-level assignments (specific tasks)
  - Assign to users, groups, or parameters
  - Dynamic assignment based on placeholders
  - Assign to user's manager
  - Exclusive assignment (only assignee can complete)
  - Auto-notify on assignment
- Placeholders with conditional logic
  - Dropdown, text, date, number, checkbox types
  - Dynamic visibility of sub-items based on selection
- **Dynamic Due Dates**
  - Rules based on checklist start date
  - Rules based on previous item completion
  - Rules based on parameter/placeholder values
  - Rules based on calendar events
  - Positive/negative offsets (before/after)
  - Business days only support
  - Custom holidays
- **Multi-Level Notification Sequences**
  - Pre-due notifications (1 day, 4 hours, etc.)
  - Post-due notifications (2 hours overdue, 1 day overdue)
  - On-completion notifications
  - On-assignment notifications
  - Custom email templates
  - Recipient types (assignee, group, custom email)
- Version control
  - Create new versions
  - View version history
  - Restore old versions
  - Delete versions
- Favorites marking
- Estimated duration tracking
- Import/export templates (JSON format)
- **Publish to Community Template Library**
  - Submit templates for approval
  - Category classification
  - Community ratings and reviews
  - Download counter
  - Featured templates

#### 3. Checklist Instances
- Create instances from templates (snapshot copy)
- **Create via Run Links** (one-click creation)
  - Public, team, or private access
  - Pre-filled parameter values
  - Usage limits and expiration
  - Unique tracking IDs
- Edit instance items (save to instance or template)
- **Runtime Assignments**
  - Override template assignments
  - Assign users/groups during execution
- Start, pause, cancel, complete instances
- Progress tracking (percentage)
- Timestamp tracking (started, completed)
- Notes and comments
- Placeholder value selection
- Apply instance changes to template (creates new version)
- Sequential mode enforcement (if enabled)
- Completion logs with action history
- **Real-Time Updates** (optional, future)
  - WebSocket support
  - Live progress indicators
  - Multi-user collaboration
  - Live cursors (optional)
- **Advanced Audit Trail**
  - Complete change history
  - Before/after values
  - User attribution
  - IP address logging
  - Timestamp precision
  - Export audit logs

#### 4. Todo Lists
- Create, read, update, delete todo lists
- Add, update, remove todo items
- Item prioritization
- Due date tracking
- Mark lists and items as completed
- Categorization via tags and folders
- Convert todo lists to checklist templates
- Favorites marking
- Import/export (JSON format)

#### 5. Calendar Integration
- Create events for checklist templates or todo lists
- Schedule with date, time, duration
- All-day events support
- Recurring events (daily, weekly, monthly, custom)
- Template presets (pre-filled values for instances)
- Event colors
- Location and description
- Reminder settings
- Event status tracking
- Reschedule events
- Drag-and-drop support (future UI feature)
- Sync with external calendars (future: Google Calendar, Outlook)

#### 6. Statistics and Analytics
- Overall dashboard metrics
- Template-specific statistics
  - Usage frequency
  - Completion rate
  - Average completion time
  - Item-level analytics
- Activity tracking
  - Tasks per day
  - Productivity by day/hour
  - Heatmap visualization
- Template ranking by usage
- Customizable time periods
- Export reports (PDF, CSV)

#### 7. Search and Filtering
- Global search across all resources
- Type-specific filtering
- Tag-based filtering
- Folder-based filtering
- Date range filtering
- Status filtering
- Pagination support

#### 8. Tags and Folders
- Create and manage tags with colors
- Create and manage folders (nested structure)
- Drag-and-drop reordering (future UI)
- Multi-assignment of tags
- Folder icons

#### 9. Webhooks
- Create and manage webhooks
- Event-based triggers:
  - Checklist created, started, completed
  - Item completed, failed
  - User assigned to task
  - Due date passed
- HMAC signature verification
- Custom headers support
- Webhook event logs
- Retry mechanism with exponential backoff
- Payload customization

#### 10. Run Links
- Create one-click run links
- Access levels: public, team, private
- Pre-filled parameter values
- Usage limits (max uses)
- Expiration dates
- Usage analytics (click tracking)
- Unique tracking IDs

#### 11. Template Library (Community)
- Browse community templates
- Search and filter by category
- Download templates
- Rate and review templates
- Submit own templates for approval
- Featured templates
- Download statistics
- Categories: DevOps, QA, HR, Finance, Marketing, Operations, Compliance
- Template versioning

#### 12. Advanced Audit
- Complete audit trail for all operations
- Entity-level tracking (created, updated, deleted)
- Change history with before/after values
- User attribution with IP and user agent
- Export audit logs (CSV, JSON)
- Audit log search and filtering
- Retention policies
- Compliance reporting

#### 13. Real-Time Collaboration (Future)
- WebSocket support for live updates
- Multi-user editing
- Live cursors and presence indicators
- Conflict resolution
- Notification badges

### API Requirements

- RESTful API design
- JSON request/response format
- JWT authentication
- Role-based access control (future: RBAC)
- API versioning (/v1/)
- Comprehensive OpenAPI/Swagger documentation
- Rate limiting (future)
- Request validation
- Error handling with meaningful messages
- Pagination for list endpoints
- Filtering and sorting support

---

## Non-Functional Requirements

### Performance
- API response time < 500ms for 95% of requests
- Database query optimization with indexes
- Pagination for large datasets
- Caching for frequently accessed data (Redis, future)
- Lazy loading for nested data

### Scalability
- Horizontal scaling support
- Stateless API design
- Database connection pooling
- Queue for background tasks (Celery, future)

### Reliability
- 99.9% uptime SLA (production)
- Automated health checks
- Database backups
- Error logging and monitoring
- Graceful degradation

### Maintainability
- Modular code structure
- Comprehensive docstrings (English)
- Type hints (PEP 484)
- Unit tests with >80% coverage
- Integration tests for critical paths
- Code linting (Black, flake8, mypy)
- Consistent code style

### Security
- Input validation and sanitization
- SQL injection prevention (ORM usage)
- XSS protection
- CORS configuration
- HTTPS only in production
- Secure password hashing (bcrypt)
- JWT token expiration and refresh
- Rate limiting
- SSRF protection on outbound webhook requests
- SSTI prevention in notification templates
- Audit logging for sensitive operations

### Usability
- Intuitive API design
- Clear error messages
- Consistent response formats
- Comprehensive documentation
- SDK/Client libraries (future: Python, JavaScript)

### Compatibility
- Support for modern browsers (UI)
- RESTful API (client-agnostic)
- Database compatibility (PostgreSQL, SQLite)
- Python 3.11+ support
- Django 5.x LTS support

---

## Security

### Authentication & Authorization
- JWT-based stateless authentication
- Access token expiration (e.g., 1 hour)
- Refresh token rotation
- User data isolation (each user sees only their data)
- User data isolation enforced at ViewSet level (all querysets filtered by request.user)
- WebSocket connections authenticated via JWT + instance access verification
- LDAP endpoints restricted to admin users
- Future: RBAC for teams

### Data Protection
- Password hashing with bcrypt
- Sensitive data encryption at rest (optional, future)
- Secure HTTPS in production
- API key management (future: for integrations)
- Circular reference detection on folder and checklist item hierarchies
- Atomic counter increments via F() expressions (race condition prevention)
- Unique constraint on (template, version_number) pairs

### API Security
- CORS configuration
- Request rate limiting (future)
- Input validation on all endpoints
- SQL injection prevention via ORM
- XSS protection in responses
- SSRF protection on webhook URLs (internal IP blocklist)
- SSTI prevention (string.Template instead of Django Template engine for user content)
- Webhook secrets are write-only (never exposed in API responses)
- Custom exception handler for consistent error format
- Soft-delete isolation via ActiveManager (default queryset excludes deleted records)

### Logging & Auditing
- Error logging with stack traces
- Action logging for critical operations
- IP address logging
- Failed login attempt logging

---

## Deployment

### Development Environment

```bash
# Clone repository
git clone https://github.com/user/Checkix.git
cd Checkix  # or cx/

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/development.txt

# Setup database
python manage.py migrate
python manage.py createsuperuser

# Run server
python manage.py runserver
```

### Production Environment

#### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: checkix
      POSTGRES_USER: checkix
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  web:
    build: .
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
      - static_volume:/app/static
      - media_volume:/app/media
    environment:
      - DEBUG=False
      - DB_HOST=db
      - REDIS_HOST=redis
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
      - celery_worker
      - celery_beat

  celery_worker:
    build: .
    command: celery -A config worker --loglevel=info
    volumes:
      - .:/app
      - media_volume:/app/media
    environment:
      - DEBUG=False
      - DB_HOST=db
      - REDIS_HOST=redis
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery_beat:
    build: .
    command: celery -A config beat --loglevel=info
    volumes:
      - .:/app
    environment:
      - DEBUG=False
      - DB_HOST=db
      - REDIS_HOST=redis
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/app/static
      - media_volume:/app/media
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web

volumes:
  postgres_data:
  redis_data:
  static_volume:
  media_volume:
```

#### Environment Variables

```bash
# .env.production
DEBUG=False
SECRET_KEY=your-secret-key-here
DB_ENGINE=django.db.backends.postgresql
DB_HOST=db
DB_PORT=5432
DB_NAME=checkix
DB_USER=checkix
DB_PASSWORD=your-db-password
REDIS_HOST=redis
REDIS_PORT=6379
ALLOWED_HOSTS=api.checkix.com,www.checkix.com
CORS_ALLOWED_ORIGINS=https://checkix.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_DEFAULT_FROM=noreply@checkix.com
SENDGRID_API_KEY=your-sendgrid-api-key

# LDAP Configuration
LDAP_SERVER=ldap://corp.yourcompany.com
LDAP_PORT=389
LDAP_USE_TLS=True
LDAP_BASE_DN=DC=yourcompany,DC=com
LDAP_USER_SEARCH=CN=Users,DC=yourcompany,DC=com
LDAP_BIND_DN=CN=admin,CN=Users,DC=yourcompany,DC=com
LDAP_BIND_PASSWORD=your-ldap-password
LDAP_SYNC_INTERVAL=3600  # Sync every hour

# Celery Configuration
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Webhook Configuration
WEBHOOK_MAX_RETRIES=3
WEBHOOK_TIMEOUT_SECONDS=30
```

### Monitoring & Logging
- Structured logging (JSON format)
- Log aggregation (ELK stack or similar, future)
- Application performance monitoring (APM, future)
- Health check endpoint: `/health/`
- Metrics endpoint: `/metrics/` (Prometheus format, future)

---

## Testing Strategy

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Test edge cases and error conditions
- Coverage target: >80%

```python
# tests/unit/test_checklist_service.py
import pytest
from apps.checklists.services import ChecklistService
from apps.checklists.exceptions import ChecklistVersionError

class TestChecklistService:
    def test_create_checklist_template_success(self):
        """Test successful creation of checklist template."""
        service = ChecklistService()
        template = service.create_template(
            name="Test Checklist",
            user_id=1,
            description="Test description"
        )
        assert template.name == "Test Checklist"
        assert template.user_id == 1

    def test_create_version_error_no_items(self):
        """Test version creation fails without items."""
        service = ChecklistService()
        with pytest.raises(ChecklistVersionError):
            service.create_version(template_id=1, items=[])
```

### Integration Tests
- Test API endpoints end-to-end
- Test database operations
- Test authentication flow
- Test business logic integration

```python
# tests/integration/test_checklist_api.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.users.models import User

@pytest.mark.django_db
class TestChecklistAPI:
    def test_create_checklist_template_authenticated(self):
        """Test creating checklist template with valid authentication."""
        client = APIClient()
        user = User.objects.create_user(username='test', password='test')
        client.force_authenticate(user=user)

        url = reverse('checklist-list')
        data = {
            "name": "Test Checklist",
            "description": "Test description"
        }
        response = client.post(url, data, format='json')

        assert response.status_code == 201
        assert response.data['name'] == "Test Checklist"
```

### End-to-End Tests
- Test complete user workflows
- Test critical paths
- Test error handling scenarios

```python
# tests/e2e/test_checklist_workflow.py
import pytest
from rest_framework.test import APIClient

@pytest.mark.e2e
@pytest.mark.django_db
class TestChecklistWorkflow:
    def test_complete_checklist_workflow(self):
        """Test complete workflow from template creation to instance completion."""
        client = APIClient()
        # 1. Create user and authenticate
        # 2. Create checklist template
        # 3. Create version with items
        # 4. Create instance
        # 5. Start instance
        # 6. Complete items
        # 7. Complete instance
        # 8. Verify statistics
        pass
```

### Test Commands

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test
pytest tests/unit/test_checklist_service.py::TestChecklistService::test_create_checklist_template_success

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/

# Run only e2e tests
pytest tests/e2e/ -m e2e
```

---

## Future Enhancements

### Phase 2 (Near Future)
1. **Enhanced Notifications**
    - Push notifications (mobile - iOS, Android)
    - In-app notifications
    - SMS notifications (optional)
    - Custom notification templates with WYSIWYG editor

2. **Teams & Collaboration**
    - Workspace management
    - Team dashboards
    - Comment system on items
    - Activity feed
    - @mentions and notifications
    - File attachments to items

3. **Mobile Applications**
    - iOS app (SwiftUI)
    - Android app (Kotlin/Flutter)
    - Offline mode support with sync
    - Push notifications
    - QR code scanning for run links

4. **Advanced Calendar Features**
    - Google Calendar two-way sync
    - Outlook Calendar two-way sync
    - iCal subscription/export
    - Drag-and-drop calendar interface
    - Calendar color themes

5. **Advanced Statistics**
    - Custom dashboard builder
    - Export to PDF reports with branding
    - CSV/Excel export with custom fields
    - API for external analytics tools (Grafana, etc.)
    - Benchmarking against industry averages

### Phase 3 (Long Term)
1. **AI Features**
    - Smart template suggestions based on user behavior
    - Auto-categorization using ML
    - Predictive scheduling optimization
    - Natural language processing for template creation (text to checklist)
    - AI-powered task duration estimation

2. **Integrations**
    - Slack/Teams native integration (bots, rich cards)
    - Jira/Trello two-way sync
    - GitHub issue creation from checklist items
    - Zapier/Make/IFTTT native connector
    - ServiceNow integration

3. **Enterprise Features**
    - SSO (Single Sign-On) - SAML 2.0, OAuth 2.0
    - Advanced RBAC with fine-grained permissions
    - Custom branding and white-label
    - Multi-tenant architecture
    - Advanced compliance reporting (SOC2, HIPAA)
    - Data retention policies

4. **Advanced Features**
    - Workflow automation engine (visual builder)
    - Conditional branching based on item completion, time, data
    - Dependencies between checklists
    - API rate limiting tiers with overage charges
    - Custom fields and entity types
    - Sandbox environments for testing

---

## Appendices

### A. API Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### B. Database Schema Migration Plan

1. Initial migration (v1.0) - Core functionality
2. Version control for checklists (v1.1)
3. Placeholders and conditional logic (v1.2)
4. Statistics aggregation tables (v1.3)
5. **LDAP/GPO integration** (v1.4)
6. **Auto-assignments** (v1.5)
7. **Dynamic due dates** (v1.6)
8. **Advanced notifications** (v1.7)
9. **Webhooks** (v1.8)
10. **Advanced audit trail** (v1.9)
11. **Halt tasks and enforced order** (v1.10)
12. **Run links** (v1.11)
13. **Template library (community)** (v1.12)
14. **Real-time collaboration (Channels)** (v2.0)
15. **Teams and workspace management** (v2.1)

### C. API Rate Limiting (Future)

| Tier | Requests per Minute | Requests per Hour |
|------|---------------------|-------------------|
| Free | 60 | 1000 |
| Pro | 120 | 5000 |
| Enterprise | Unlimited | Unlimited |

---

**Document Version:** 2.0
**Last Updated:** 2026-02-11
**Author:** Checkix (cx) Development Team
