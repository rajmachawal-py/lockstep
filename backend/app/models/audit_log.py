"""
SQLAlchemy model for immutable audit logs.
Records every significant action on a work item with before/after snapshots.
"""

from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.models import Base


class AuditAction(str, enum.Enum):
    created = "created"
    claimed = "claimed"
    unassigned = "unassigned"
    status_changed = "status_changed"
    edited = "edited"
    approved = "approved"
    rejected = "rejected"
    resolved = "resolved"
    closed = "closed"
    comment_added = "comment_added"


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.work_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    action = Column(
        Enum(AuditAction, name="audit_action", schema="public", create_type=False),
        nullable=False,
    )
    old_values = Column(JSONB, nullable=True)  # Snapshot before change
    new_values = Column(JSONB, nullable=True)  # Snapshot after change
    extra_metadata = Column("metadata", JSONB, nullable=True)  # Extra context (rejection reason, notes, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    work_item = relationship("WorkItem", back_populates="audit_logs")
    actor = relationship("Profile", lazy="selectin")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, item={self.work_item_id})>"
