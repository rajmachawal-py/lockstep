"""
Pytest configuration and async fixtures for Newtonite Ops Manager.
Provides mock entities, database sessions, and an HTTP async test client.
"""

import pytest
import pytest_asyncio
from uuid import uuid4, UUID
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.dependencies import get_current_user, get_db
from app.models.user import Profile
from app.models.team import Team, TeamMember, TeamRole
from app.models.work_item import WorkItem, WorkItemStatus, WorkItemPriority, WorkItemCategory


@pytest.fixture
def mock_team_id():
    return uuid4()


@pytest.fixture
def mock_user_member(mock_team_id):
    """A regular team member."""
    user = Profile(
        id=uuid4(),
        email="member@newtonite.io",
        full_name="Alex Member",
        avatar_url=None,
    )
    # Mock team membership
    membership = TeamMember(
        id=uuid4(),
        team_id=mock_team_id,
        user_id=user.id,
        role=TeamRole.member,
    )
    user.team_memberships = [membership]
    return user


@pytest.fixture
def mock_user_lead(mock_team_id):
    """A team lead."""
    user = Profile(
        id=uuid4(),
        email="lead@newtonite.io",
        full_name="Sam Lead",
        avatar_url=None,
    )
    membership = TeamMember(
        id=uuid4(),
        team_id=mock_team_id,
        user_id=user.id,
        role=TeamRole.lead,
    )
    user.team_memberships = [membership]
    return user


@pytest.fixture
def mock_user_manager(mock_team_id):
    """A manager."""
    user = Profile(
        id=uuid4(),
        email="manager@newtonite.io",
        full_name="Morgan Manager",
        avatar_url=None,
    )
    membership = TeamMember(
        id=uuid4(),
        team_id=mock_team_id,
        user_id=user.id,
        role=TeamRole.manager,
    )
    user.team_memberships = [membership]
    return user


@pytest.fixture
def mock_work_item(mock_team_id, mock_user_member):
    """Sample work item with initial version 1."""
    team = Team(id=mock_team_id, name="Core Engineering", description="Core Platform")
    item = WorkItem(
        id=uuid4(),
        title="Critical Payment Gateway Latency Spike",
        description="P99 latency increased by 400ms following deployment v2.14",
        category=WorkItemCategory.incident,
        priority=WorkItemPriority.urgent,
        status=WorkItemStatus.open,
        owning_team_id=mock_team_id,
        assignee_id=None,
        created_by=mock_user_member.id,
        version=1,
        resolution_notes=None,
    )
    from datetime import datetime, timezone
    item.created_at = datetime.now(timezone.utc)
    item.updated_at = datetime.now(timezone.utc)
    item.owning_team = team
    item.creator = mock_user_member
    item.assignee = None
    return item


@pytest_asyncio.fixture
async def async_client(mock_user_member):
    """Async HTTP client with authenticated user dependency override."""
    app.dependency_overrides[get_current_user] = lambda: mock_user_member

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
