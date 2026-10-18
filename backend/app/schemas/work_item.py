"""
Pydantic schemas for Work Item request/response validation.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum


# ── Enums (mirror DB enums for API docs) ────────────────────

class WorkItemCategoryEnum(str, Enum):
    incident = "incident"
    customer_issue = "customer_issue"
    engineering_bug = "engineering_bug"
    compliance_task = "compliance_task"
    operational_request = "operational_request"


class WorkItemPriorityEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class WorkItemStatusEnum(str, Enum):
    open = "open"
    in_investigation = "in_investigation"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"
    closed = "closed"


# ── Request Schemas ─────────────────────────────────────────

class WorkItemCreate(BaseModel):
    """Schema for creating a new work item."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: WorkItemCategoryEnum = WorkItemCategoryEnum.operational_request
    priority: WorkItemPriorityEnum = WorkItemPriorityEnum.medium
    owning_team_id: UUID


class WorkItemUpdate(BaseModel):
    """
    Schema for updating a work item.
    `version` is REQUIRED for Optimistic Concurrency Control.
    """
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[WorkItemCategoryEnum] = None
    priority: Optional[WorkItemPriorityEnum] = None
    version: int = Field(..., description="Current known version for OCC conflict detection")


class WorkItemTransition(BaseModel):
    """Schema for requesting a status transition."""
    target_status: WorkItemStatusEnum
    version: int = Field(..., description="Current known version for OCC conflict detection")
    resolution_notes: Optional[str] = None  # Required for resolved/closed transitions
    rejection_reason: Optional[str] = None  # Required for rejected transitions


class WorkItemClaim(BaseModel):
    """Schema for claiming (self-assigning) a work item."""
    version: int = Field(..., description="Current known version for OCC conflict detection")


# ── Response Schemas ────────────────────────────────────────

class ProfileSummary(BaseModel):
    """Lightweight profile representation for embedding in responses."""
    id: UUID
    full_name: str
    email: str
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TeamSummary(BaseModel):
    """Lightweight team representation for embedding in responses."""
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class WorkItemResponse(BaseModel):
    """Full work item response returned from the API."""
    id: UUID
    title: str
    description: Optional[str]
    category: WorkItemCategoryEnum
    priority: WorkItemPriorityEnum
    status: WorkItemStatusEnum
    owning_team: TeamSummary
    assignee: Optional[ProfileSummary]
    creator: ProfileSummary
    resolution_notes: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkItemListItem(BaseModel):
    """Lean work item summary for paginated list responses."""
    id: UUID
    title: str
    category: WorkItemCategoryEnum
    priority: WorkItemPriorityEnum
    status: WorkItemStatusEnum
    owning_team: TeamSummary
    assignee: Optional[ProfileSummary]
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Audit Log Response ──────────────────────────────────────

class AuditLogResponse(BaseModel):
    """Audit log entry for the work item timeline."""
    id: UUID
    action: str
    actor: ProfileSummary
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
