"""
SQLAlchemy model for user profiles.
Maps to the public.profiles table in Supabase PostgreSQL.
"""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.models import Base


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    team_memberships = relationship("TeamMember", back_populates="user", lazy="selectin")

    def __repr__(self):
        return f"<Profile(id={self.id}, name={self.full_name}, email={self.email})>"
