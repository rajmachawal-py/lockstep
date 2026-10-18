"""
SQLAlchemy model for work items — the core operational entity.
Includes version column for Optimistic Concurrency Control (OCC).
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.models import Base


class WorkItemCategory(str, enum.Enum):
    incident = "incident"
    customer_issue = "customer_issue"
    engineering_bug = "engineering_bug"
    compliance_task = "compliance_task"
    operational_request = "operational_request"


class WorkItemPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class WorkItemStatus(str, enum.Enum):
    open = "open"
    in_investigation = "in_investigation"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"
    closed = "closed"


class WorkItem(Base):
    __tablename__ = "work_items"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(
        Enum(WorkItemCategory, name="work_item_category", schema="public", create_type=False),
        nullable=False,
        default=WorkItemCategory.operational_request,
    )
    priority = Column(
        Enum(WorkItemPriority, name="work_item_priority", schema="public", create_type=False),
        nullable=False,
        default=WorkItemPriority.medium,
    )
    status = Column(
        Enum(WorkItemStatus, name="work_item_status", schema="public", create_type=False),
        nullable=False,
        default=WorkItemStatus.open,
    )
    owning_team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.teams.id", ondelete="RESTRICT"),
        nullable=False,
    )
    assignee_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    resolution_notes = Column(Text, nullable=True)

    # Optimistic Concurrency Control: incremented on every update
    version = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    owning_team = relationship("Team", foreign_keys=[owning_team_id], lazy="selectin")
    assignee = relationship("Profile", foreign_keys=[assignee_id], lazy="selectin")
    creator = relationship("Profile", foreign_keys=[created_by], lazy="selectin")
    audit_logs = relationship("AuditLog", back_populates="work_item", lazy="dynamic")

    def __repr__(self):
        return f"<WorkItem(id={self.id}, title={self.title}, status={self.status}, v={self.version})>"
