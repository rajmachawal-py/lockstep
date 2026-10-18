"""
SQLAlchemy models for teams and team memberships.
Maps to public.teams and public.team_members tables.
"""

from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.models import Base


class TeamRole(str, enum.Enum):
    """Mirrors the public.team_role ENUM in PostgreSQL."""
    member = "member"
    lead = "lead"
    manager = "manager"


class Team(Base):
    __tablename__ = "teams"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    members = relationship("TeamMember", back_populates="team", lazy="selectin")

    def __repr__(self):
        return f"<Team(id={self.id}, name={self.name})>"


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_user"),
        {"schema": "public"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("public.teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(TeamRole, name="team_role", schema="public", create_type=False), nullable=False, default=TeamRole.member)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("Profile", back_populates="team_memberships")

    def __repr__(self):
        return f"<TeamMember(team={self.team_id}, user={self.user_id}, role={self.role})>"
