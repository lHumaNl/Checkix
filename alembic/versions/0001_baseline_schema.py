"""Baseline schema for the FastAPI SQLAlchemy models.

Revision ID: 0001_baseline_schema
Revises:
Create Date: 2026-06-02
"""

from alembic import op

revision = "0001_baseline_schema"
down_revision = None
branch_labels = None
depends_on = None


TABLES = (
    "auth_user",
    "users_group",
    "users_groupmembership",
    "users_userprofile",
    "folders",
    "tags",
    "checklist_templates",
    "checklist_versions",
    "checklist_placeholders",
    "checklist_placeholder_options",
    "checklist_items",
    "checklist_templates_tags",
    "checklist_usage_stats",
    "community_templates",
    "community_template_ratings",
    "run_links",
    "todo_lists",
    "todo_items",
    "todo_lists_tags",
    "calendar_events",
    "checklist_instances",
    "checklist_item_instances",
    "completion_logs",
    "assignments",
    "audit_logs",
    "dynamic_due_date_rules",
    "notification_rules",
    "notification_sequences",
    "notification_logs",
    "webhooks",
    "webhook_events",
    "ldap_sync_logs",
)


def upgrade() -> None:
    """Create the fixed baseline schema with explicit operations."""
    _create_tables()
    _create_foreign_keys()
    _create_indexes()


def downgrade() -> None:
    """Drop the fixed baseline schema in dependency-safe order."""
    op.drop_constraint("fk_checklist_templates_current_version_id", "checklist_templates", type_="foreignkey")
    for table_name in reversed(TABLES):
        op.drop_table(table_name)


def _create_tables() -> None:
    op.execute(
        """CREATE TABLE auth_user (
        id BIGSERIAL NOT NULL, password VARCHAR(128) NOT NULL,
        last_login TIMESTAMP WITH TIME ZONE, is_superuser BOOLEAN NOT NULL,
        username VARCHAR(150) NOT NULL, first_name VARCHAR(150) NOT NULL,
        last_name VARCHAR(150) NOT NULL, email VARCHAR(254) NOT NULL,
        is_staff BOOLEAN NOT NULL, is_active BOOLEAN NOT NULL,
        date_joined TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), UNIQUE (username))"""
    )
    op.execute(
        """CREATE TABLE users_group (
        name VARCHAR(100) NOT NULL, description TEXT, ldap_group_dn VARCHAR(255),
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), UNIQUE (name))"""
    )
    op.execute(
        """CREATE TABLE users_groupmembership (
        id BIGSERIAL NOT NULL, user_id BIGINT NOT NULL, group_id BIGINT NOT NULL,
        role VARCHAR(20) NOT NULL, joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), CONSTRAINT uq_groupmembership_user_group UNIQUE (user_id, group_id))"""
    )
    op.execute(
        """CREATE TABLE users_userprofile (
        user_id BIGINT NOT NULL, timezone VARCHAR(50) NOT NULL, language VARCHAR(10) NOT NULL,
        notification_preferences JSON NOT NULL, ldap_dn VARCHAR(255), employee_id VARCHAR(50),
        department VARCHAR(100), manager_id BIGINT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), UNIQUE (user_id))"""
    )
    op.execute(
        """CREATE TABLE folders (
        name VARCHAR(200) NOT NULL, user_id BIGINT NOT NULL, parent_id BIGINT,
        icon VARCHAR(50) NOT NULL, "order" INTEGER NOT NULL, lft INTEGER, rght INTEGER,
        tree_id INTEGER, level INTEGER, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE tags (
        name VARCHAR(100) NOT NULL, color VARCHAR(7) NOT NULL, user_id BIGINT NOT NULL,
        description TEXT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), CONSTRAINT uq_tags_name_user_id UNIQUE (name, user_id))"""
    )
    op.execute(
        """CREATE TABLE checklist_templates (
        name VARCHAR(200) NOT NULL, description TEXT, user_id BIGINT NOT NULL,
        folder_id BIGINT, current_version_id BIGINT, sequential_mode BOOLEAN NOT NULL,
        icon VARCHAR(50), is_favorite BOOLEAN NOT NULL, status VARCHAR(20) NOT NULL,
        category VARCHAR(100), estimated_duration_seconds INTEGER, is_deleted BOOLEAN NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE checklist_versions (
        template_id BIGINT NOT NULL, version_number INTEGER NOT NULL, changelog TEXT,
        is_active BOOLEAN NOT NULL, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), CONSTRAINT uq_checklist_versions_template_version UNIQUE (template_id, version_number))"""
    )
    op.execute(
        """CREATE TABLE checklist_placeholders (
        name VARCHAR(100) NOT NULL, placeholder_type VARCHAR(20) NOT NULL,
        is_required BOOLEAN NOT NULL, default_value VARCHAR(200), version_id BIGINT,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE checklist_placeholder_options (
        placeholder_id BIGINT NOT NULL, value VARCHAR(200) NOT NULL,
        display_text VARCHAR(200), "order" INTEGER NOT NULL, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE checklist_items (
        version_id BIGINT NOT NULL, parent_id BIGINT, title VARCHAR(500) NOT NULL,
        description TEXT, "order" INTEGER NOT NULL, is_required BOOLEAN NOT NULL,
        priority VARCHAR(20), placeholder_id BIGINT, is_halt BOOLEAN NOT NULL,
        halt_message VARCHAR(500), lft INTEGER, rght INTEGER, tree_id INTEGER, level INTEGER,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE checklist_templates_tags (
        template_id BIGINT NOT NULL, tag_id BIGINT NOT NULL, PRIMARY KEY (template_id, tag_id))"""
    )
    op.execute(
        """CREATE TABLE checklist_usage_stats (
        template_id BIGINT NOT NULL, date DATE NOT NULL, instances_created INTEGER NOT NULL,
        instances_completed INTEGER NOT NULL, avg_completion_time_seconds INTEGER,
        avg_completion_percentage FLOAT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), CONSTRAINT uq_checklist_usage_stats_template_date UNIQUE (template_id, date))"""
    )
    op.execute(
        """CREATE TABLE community_templates (
        checklist_template_id BIGINT NOT NULL, author_id BIGINT, name VARCHAR(200) NOT NULL,
        description TEXT, category VARCHAR(20), status VARCHAR(20) NOT NULL, tags JSON NOT NULL,
        download_count INTEGER NOT NULL, rating FLOAT, rating_count INTEGER NOT NULL,
        is_featured BOOLEAN NOT NULL, published_at TIMESTAMP WITH TIME ZONE,
        approved_by_id BIGINT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), UNIQUE (checklist_template_id))"""
    )
    op.execute(
        """CREATE TABLE community_template_ratings (
        community_template_id BIGINT NOT NULL, user_id BIGINT NOT NULL, rating INTEGER NOT NULL,
        comment TEXT, id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), CONSTRAINT uq_community_template_ratings_template_user UNIQUE (community_template_id, user_id))"""
    )
    op.execute(
        """CREATE TABLE run_links (
        checklist_template_id BIGINT NOT NULL, unique_id VARCHAR(36) NOT NULL,
        name VARCHAR(200) NOT NULL, access_type VARCHAR(20) NOT NULL, preset_values JSON NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE, max_uses INTEGER, usage_count INTEGER NOT NULL,
        created_by_id BIGINT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        PRIMARY KEY (id), UNIQUE (unique_id))"""
    )
    op.execute(
        """CREATE TABLE todo_lists (
        name VARCHAR(200) NOT NULL, description TEXT, user_id BIGINT NOT NULL, folder_id BIGINT,
        status VARCHAR(20) NOT NULL, due_date TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE, priority VARCHAR(20) NOT NULL, icon VARCHAR(50),
        is_favorite BOOLEAN NOT NULL, is_deleted BOOLEAN NOT NULL, deleted_at TIMESTAMP WITH TIME ZONE,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE todo_items (
        todo_list_id BIGINT NOT NULL, title VARCHAR(500) NOT NULL, description TEXT,
        status VARCHAR(20) NOT NULL, "order" INTEGER NOT NULL, due_date TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE, priority VARCHAR(20), parent_id BIGINT,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE todo_lists_tags (
        todo_list_id BIGINT NOT NULL, tag_id BIGINT NOT NULL, PRIMARY KEY (todo_list_id, tag_id))"""
    )
    op.execute(
        """CREATE TABLE calendar_events (
        title VARCHAR(200) NOT NULL, user_id BIGINT NOT NULL, event_type VARCHAR(20) NOT NULL,
        checklist_template_id BIGINT, todo_list_id BIGINT,
        start_datetime TIMESTAMP WITH TIME ZONE NOT NULL, end_datetime TIMESTAMP WITH TIME ZONE,
        all_day BOOLEAN NOT NULL, recurrence VARCHAR(20) NOT NULL, recurrence_rule JSON,
        location VARCHAR(200), description TEXT, color VARCHAR(7) NOT NULL,
        reminder_minutes_before INTEGER, template_presets JSON, is_completed BOOLEAN NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE checklist_instances (
        template_id BIGINT, version_id BIGINT, name VARCHAR(200) NOT NULL, user_id BIGINT NOT NULL,
        status VARCHAR(20) NOT NULL, started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE, progress_percentage INTEGER NOT NULL, notes TEXT,
        calendar_event_id BIGINT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE checklist_item_instances (
        instance_id BIGINT NOT NULL, item_id BIGINT, title VARCHAR(500) NOT NULL,
        description TEXT, "order" INTEGER NOT NULL, is_completed BOOLEAN NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE, placeholder_value VARCHAR(200), parent_id BIGINT,
        is_visible BOOLEAN NOT NULL, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE completion_logs (
        instance_id BIGINT NOT NULL, item_instance_id BIGINT, action VARCHAR(50) NOT NULL,
        user_id BIGINT, timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        duration_seconds INTEGER, notes TEXT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE assignments (
        user_id BIGINT, assignment_type VARCHAR(20) NOT NULL, checklist_template_id BIGINT,
        checklist_item_id BIGINT, checklist_instance_id BIGINT, assignee_type VARCHAR(20) NOT NULL,
        assignee_user_id BIGINT, assignee_group_id BIGINT, assignee_parameter VARCHAR(100),
        is_exclusive BOOLEAN NOT NULL, auto_notify BOOLEAN NOT NULL, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE audit_logs (
        user_id BIGINT, action VARCHAR(20) NOT NULL, entity_type VARCHAR(30) NOT NULL,
        entity_id BIGINT NOT NULL, entity_name VARCHAR(200), checklist_instance_id BIGINT,
        changes JSON, ip_address VARCHAR(45), user_agent TEXT, additional_data JSON,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE dynamic_due_date_rules (
        checklist_template_id BIGINT, checklist_item_id BIGINT, created_by_id BIGINT,
        trigger_type VARCHAR(30) NOT NULL, trigger_item_id INTEGER,
        trigger_parameter_name VARCHAR(100), offset_minutes INTEGER NOT NULL,
        business_days_only BOOLEAN NOT NULL, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE notification_rules (
        checklist_template_id BIGINT, checklist_item_id BIGINT, assignment_id BIGINT,
        created_by_id BIGINT, event_type VARCHAR(30) NOT NULL, is_active BOOLEAN NOT NULL,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE notification_sequences (
        notification_rule_id BIGINT NOT NULL, sequence_order INTEGER NOT NULL,
        trigger_offset_minutes INTEGER NOT NULL, recipient_type VARCHAR(20) NOT NULL,
        recipient_group_id BIGINT, custom_email VARCHAR(254), email_subject VARCHAR(200),
        email_body TEXT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE notification_logs (
        notification_sequence_id BIGINT NOT NULL, checklist_instance_id BIGINT,
        recipient_email VARCHAR(254) NOT NULL, status VARCHAR(20) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE, error_message TEXT, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE webhooks (
        name VARCHAR(200) NOT NULL, user_id BIGINT NOT NULL, event_type VARCHAR(30) NOT NULL,
        endpoint_url VARCHAR(500) NOT NULL, secret VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL, headers JSON NOT NULL, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE webhook_events (
        webhook_id BIGINT NOT NULL, checklist_instance_id BIGINT, event_type VARCHAR(30) NOT NULL,
        payload JSON, status VARCHAR(20) NOT NULL, response_code INTEGER, response_body TEXT,
        retry_count INTEGER NOT NULL, max_retries INTEGER NOT NULL,
        next_retry_at TIMESTAMP WITH TIME ZONE, sent_at TIMESTAMP WITH TIME ZONE,
        id BIGSERIAL NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )
    op.execute(
        """CREATE TABLE ldap_sync_logs (
        status VARCHAR(20) NOT NULL, users_synced INTEGER NOT NULL, groups_synced INTEGER NOT NULL,
        users_created INTEGER NOT NULL, groups_created INTEGER NOT NULL, users_updated INTEGER NOT NULL,
        groups_updated INTEGER NOT NULL, error_message TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE, details JSON, id BIGSERIAL NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, PRIMARY KEY (id))"""
    )


def _create_foreign_keys() -> None:
    fk = op.create_foreign_key
    fk("fk_users_groupmembership_user_id", "users_groupmembership", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_users_groupmembership_group_id", "users_groupmembership", "users_group", ["group_id"], ["id"], ondelete="CASCADE")
    fk("fk_users_userprofile_user_id", "users_userprofile", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_users_userprofile_manager_id", "users_userprofile", "auth_user", ["manager_id"], ["id"], ondelete="SET NULL")
    fk("fk_folders_user_id", "folders", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_folders_parent_id", "folders", "folders", ["parent_id"], ["id"], ondelete="CASCADE")
    fk("fk_tags_user_id", "tags", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_templates_user_id", "checklist_templates", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_templates_folder_id", "checklist_templates", "folders", ["folder_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_versions_template_id", "checklist_versions", "checklist_templates", ["template_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_templates_current_version_id", "checklist_templates", "checklist_versions", ["current_version_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_placeholders_version_id", "checklist_placeholders", "checklist_versions", ["version_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_placeholder_options_placeholder_id", "checklist_placeholder_options", "checklist_placeholders", ["placeholder_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_items_version_id", "checklist_items", "checklist_versions", ["version_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_items_parent_id", "checklist_items", "checklist_items", ["parent_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_items_placeholder_id", "checklist_items", "checklist_placeholders", ["placeholder_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_templates_tags_template_id", "checklist_templates_tags", "checklist_templates", ["template_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_templates_tags_tag_id", "checklist_templates_tags", "tags", ["tag_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_usage_stats_template_id", "checklist_usage_stats", "checklist_templates", ["template_id"], ["id"], ondelete="CASCADE")
    fk("fk_community_templates_checklist_template_id", "community_templates", "checklist_templates", ["checklist_template_id"], ["id"], ondelete="CASCADE")
    fk("fk_community_templates_author_id", "community_templates", "auth_user", ["author_id"], ["id"], ondelete="SET NULL")
    fk("fk_community_templates_approved_by_id", "community_templates", "auth_user", ["approved_by_id"], ["id"], ondelete="SET NULL")
    fk("fk_community_template_ratings_community_template_id", "community_template_ratings", "community_templates", ["community_template_id"], ["id"], ondelete="CASCADE")
    fk("fk_community_template_ratings_user_id", "community_template_ratings", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_run_links_checklist_template_id", "run_links", "checklist_templates", ["checklist_template_id"], ["id"], ondelete="CASCADE")
    fk("fk_run_links_created_by_id", "run_links", "auth_user", ["created_by_id"], ["id"], ondelete="SET NULL")
    fk("fk_todo_lists_user_id", "todo_lists", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_todo_lists_folder_id", "todo_lists", "folders", ["folder_id"], ["id"], ondelete="SET NULL")
    fk("fk_todo_items_todo_list_id", "todo_items", "todo_lists", ["todo_list_id"], ["id"], ondelete="CASCADE")
    fk("fk_todo_items_parent_id", "todo_items", "todo_items", ["parent_id"], ["id"], ondelete="CASCADE")
    fk("fk_todo_lists_tags_todo_list_id", "todo_lists_tags", "todo_lists", ["todo_list_id"], ["id"], ondelete="CASCADE")
    fk("fk_todo_lists_tags_tag_id", "todo_lists_tags", "tags", ["tag_id"], ["id"], ondelete="CASCADE")
    fk("fk_calendar_events_user_id", "calendar_events", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_calendar_events_checklist_template_id", "calendar_events", "checklist_templates", ["checklist_template_id"], ["id"], ondelete="SET NULL")
    fk("fk_calendar_events_todo_list_id", "calendar_events", "todo_lists", ["todo_list_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_instances_template_id", "checklist_instances", "checklist_templates", ["template_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_instances_version_id", "checklist_instances", "checklist_versions", ["version_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_instances_user_id", "checklist_instances", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_instances_calendar_event_id", "checklist_instances", "calendar_events", ["calendar_event_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_item_instances_instance_id", "checklist_item_instances", "checklist_instances", ["instance_id"], ["id"], ondelete="CASCADE")
    fk("fk_checklist_item_instances_item_id", "checklist_item_instances", "checklist_items", ["item_id"], ["id"], ondelete="SET NULL")
    fk("fk_checklist_item_instances_parent_id", "checklist_item_instances", "checklist_item_instances", ["parent_id"], ["id"], ondelete="CASCADE")
    fk("fk_completion_logs_instance_id", "completion_logs", "checklist_instances", ["instance_id"], ["id"], ondelete="CASCADE")
    fk("fk_completion_logs_item_instance_id", "completion_logs", "checklist_item_instances", ["item_instance_id"], ["id"], ondelete="SET NULL")
    fk("fk_completion_logs_user_id", "completion_logs", "auth_user", ["user_id"], ["id"], ondelete="SET NULL")
    fk("fk_assignments_user_id", "assignments", "auth_user", ["user_id"], ["id"], ondelete="SET NULL")
    fk("fk_assignments_checklist_template_id", "assignments", "checklist_templates", ["checklist_template_id"], ["id"], ondelete="CASCADE")
    fk("fk_assignments_checklist_item_id", "assignments", "checklist_items", ["checklist_item_id"], ["id"], ondelete="CASCADE")
    fk("fk_assignments_checklist_instance_id", "assignments", "checklist_instances", ["checklist_instance_id"], ["id"], ondelete="CASCADE")
    fk("fk_assignments_assignee_user_id", "assignments", "auth_user", ["assignee_user_id"], ["id"], ondelete="SET NULL")
    fk("fk_assignments_assignee_group_id", "assignments", "users_group", ["assignee_group_id"], ["id"], ondelete="SET NULL")
    fk("fk_audit_logs_user_id", "audit_logs", "auth_user", ["user_id"], ["id"], ondelete="SET NULL")
    fk("fk_audit_logs_checklist_instance_id", "audit_logs", "checklist_instances", ["checklist_instance_id"], ["id"], ondelete="SET NULL")
    fk("fk_dynamic_due_date_rules_checklist_template_id", "dynamic_due_date_rules", "checklist_templates", ["checklist_template_id"], ["id"], ondelete="SET NULL")
    fk("fk_dynamic_due_date_rules_checklist_item_id", "dynamic_due_date_rules", "checklist_items", ["checklist_item_id"], ["id"], ondelete="SET NULL")
    fk("fk_dynamic_due_date_rules_created_by_id", "dynamic_due_date_rules", "auth_user", ["created_by_id"], ["id"], ondelete="SET NULL")
    fk("fk_notification_rules_checklist_template_id", "notification_rules", "checklist_templates", ["checklist_template_id"], ["id"], ondelete="SET NULL")
    fk("fk_notification_rules_checklist_item_id", "notification_rules", "checklist_items", ["checklist_item_id"], ["id"], ondelete="SET NULL")
    fk("fk_notification_rules_assignment_id", "notification_rules", "assignments", ["assignment_id"], ["id"], ondelete="SET NULL")
    fk("fk_notification_rules_created_by_id", "notification_rules", "auth_user", ["created_by_id"], ["id"], ondelete="SET NULL")
    fk("fk_notification_sequences_notification_rule_id", "notification_sequences", "notification_rules", ["notification_rule_id"], ["id"], ondelete="CASCADE")
    fk("fk_notification_sequences_recipient_group_id", "notification_sequences", "users_group", ["recipient_group_id"], ["id"], ondelete="SET NULL")
    fk("fk_notification_logs_notification_sequence_id", "notification_logs", "notification_sequences", ["notification_sequence_id"], ["id"], ondelete="CASCADE")
    fk("fk_notification_logs_checklist_instance_id", "notification_logs", "checklist_instances", ["checklist_instance_id"], ["id"], ondelete="CASCADE")
    fk("fk_webhooks_user_id", "webhooks", "auth_user", ["user_id"], ["id"], ondelete="CASCADE")
    fk("fk_webhook_events_webhook_id", "webhook_events", "webhooks", ["webhook_id"], ["id"], ondelete="CASCADE")
    fk("fk_webhook_events_checklist_instance_id", "webhook_events", "checklist_instances", ["checklist_instance_id"], ["id"], ondelete="SET NULL")


def _create_indexes() -> None:
    for table_name, column_name in (
        ("folders", "user_id"), ("folders", "parent_id"), ("tags", "user_id"),
        ("checklist_templates", "user_id"), ("checklist_templates", "folder_id"),
        ("checklist_templates", "is_favorite"), ("checklist_templates", "status"),
        ("checklist_templates", "is_deleted"), ("checklist_versions", "template_id"),
        ("checklist_placeholders", "version_id"), ("checklist_placeholder_options", "placeholder_id"),
        ("checklist_items", "version_id"), ("checklist_items", "parent_id"),
        ("checklist_usage_stats", "template_id"), ("community_templates", "status"),
        ("community_template_ratings", "community_template_id"), ("run_links", "checklist_template_id"),
        ("todo_lists", "user_id"), ("todo_lists", "folder_id"), ("todo_lists", "is_deleted"),
        ("todo_items", "todo_list_id"), ("todo_items", "parent_id"),
        ("calendar_events", "user_id"), ("calendar_events", "start_datetime"),
        ("calendar_events", "is_completed"), ("checklist_instances", "template_id"),
        ("checklist_instances", "version_id"), ("checklist_instances", "user_id"),
        ("checklist_item_instances", "instance_id"), ("checklist_item_instances", "parent_id"),
        ("completion_logs", "instance_id"), ("assignments", "user_id"), ("audit_logs", "user_id"),
        ("notification_sequences", "notification_rule_id"),
        ("notification_logs", "notification_sequence_id"), ("webhooks", "user_id"),
        ("webhook_events", "webhook_id"),
    ):
        op.create_index(f"ix_{table_name}_{column_name}", table_name, [column_name])
