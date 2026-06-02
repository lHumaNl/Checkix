"""Assignment schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema


class AssignmentOut(ORMSchema):
    id: int
    assignment_type: str
    checklist_template: Optional[int] = Field(default=None, validation_alias="checklist_template_id")
    checklist_template_name: Optional[str] = None
    checklist_item: Optional[int] = Field(default=None, validation_alias="checklist_item_id")
    checklist_item_title: Optional[str] = None
    checklist_instance: Optional[int] = Field(default=None, validation_alias="checklist_instance_id")
    checklist_instance_name: Optional[str] = None
    assignee_type: Optional[str] = None
    assignee_user: Optional[int] = Field(default=None, validation_alias="assignee_user_id")
    assignee_user_name: Optional[str] = None
    assignee_group: Optional[int] = Field(default=None, validation_alias="assignee_group_id")
    assignee_group_name: Optional[str] = None
    assignee_parameter: Optional[str] = None
    assignee_display: str = ""
    target_display: str = ""
    is_exclusive: bool = False
    auto_notify: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_type: str = "template"
    checklist_template: Optional[int] = None
    checklist_item: Optional[int] = None
    checklist_instance: Optional[int] = None
    assignee_type: str = "user"
    assignee_user: Optional[int] = None
    assignee_group: Optional[int] = None
    assignee_parameter: Optional[str] = None
    is_exclusive: bool = False
    auto_notify: bool = True
