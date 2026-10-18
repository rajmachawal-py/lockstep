"""
Pydantic schemas for team-related endpoints.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class TeamResponse(BaseModel):
    """Full team response."""
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamMemberResponse(BaseModel):
    """Team membership response with user profile info."""
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamDetailResponse(BaseModel):
    """Team with its members."""
    id: UUID
    name: str
    description: Optional[str] = None
    members: List[TeamMemberResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
