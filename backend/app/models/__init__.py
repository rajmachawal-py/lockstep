"""
SQLAlchemy declarative base and model imports.
All models must be imported here for proper table registration.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# Import all models so they register with Base.metadata
# These imports must happen after Base is defined
from app.models.user import Profile  # noqa: E402, F401
from app.models.team import Team, TeamMember, TeamRole  # noqa: E402, F401
from app.models.work_item import WorkItem, WorkItemStatus, WorkItemPriority, WorkItemCategory  # noqa: E402, F401
from app.models.audit_log import AuditLog, AuditAction  # noqa: E402, F401
