"""
Tests for Optimistic Concurrency Control (OCC).

Validates:
- Successful update when payload.version matches stored item.version
- Version increment on successful update
- 409 Conflict rejection when payload.version does not match item.version (stale edit)
- Conflict payload includes current server data and versions for client-side diff/reconciliation
"""

import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from fastapi import status

from app.main import app
from app.dependencies import get_current_user, get_db
from app.models.work_item import WorkItem, WorkItemStatus, WorkItemPriority, WorkItemCategory
from app.models.team import Team, TeamRole


@pytest.mark.asyncio
async def test_update_success_increments_version(async_client, mock_work_item, mock_user_member):
    """
    Updating an item with matching version succeeds and increments the version counter.
    """
    mock_db = AsyncMock()

    # Mock DB query returning the work item
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_work_item
    mock_db.execute.return_value = mock_result

    # Mock user role check
    role_result = MagicMock()
    role_result.scalar_one_or_none.return_value = TeamRole.member
    mock_db.execute.side_effect = [
        mock_result,  # fetch work item
        role_result,  # require_team_membership role check
        AsyncMock(),  # audit log insert / update
    ]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user_member

    payload = {
        "title": "Updated Gateway Title",
        "description": "Updated incident description",
        "priority": "high",
        "version": 1,  # Matches mock_work_item.version
    }

    response = await async_client.put(f"/api/v1/work-items/{mock_work_item.id}", json=payload)
    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Updated Gateway Title"
    assert data["version"] == 2  # Incremented from 1 to 2
    assert mock_work_item.version == 2


@pytest.mark.asyncio
async def test_update_stale_version_returns_409_conflict(async_client, mock_work_item, mock_user_member):
    """
    Updating an item with an outdated version (e.g., version=1 when server has version=3)
    must fail with 409 Conflict, returning conflict details and current server state.
    """
    mock_work_item.version = 3  # Server already bumped version
    mock_db = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_work_item

    role_result = MagicMock()
    role_result.scalar_one_or_none.return_value = TeamRole.member

    mock_db.execute.side_effect = [
        mock_result,  # fetch work item
        role_result,  # require_team_membership role check
    ]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user_member

    stale_payload = {
        "title": "Stale Overwrite Attempt",
        "version": 1,  # Stale: client still thinks version is 1
    }

    response = await async_client.put(f"/api/v1/work-items/{mock_work_item.id}", json=stale_payload)
    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_409_CONFLICT
    error = response.json()
    assert "Conflict" in error["detail"]["message"]
    assert error["detail"]["your_version"] == 1
    assert error["detail"]["current_version"] == 3
    assert "current_data" in error["detail"]
    assert error["detail"]["current_data"]["id"] == str(mock_work_item.id)


@pytest.mark.asyncio
async def test_claim_stale_version_returns_409_conflict(async_client, mock_work_item, mock_user_member):
    """
    Attempting to claim an item when the client's version is stale also triggers 409 Conflict.
    """
    mock_work_item.version = 2
    mock_db = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_work_item

    role_result = MagicMock()
    role_result.scalar_one_or_none.return_value = TeamRole.member

    mock_db.execute.side_effect = [
        mock_result,
        role_result,
    ]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user_member

    claim_payload = {"version": 1}  # Stale

    response = await async_client.post(f"/api/v1/work-items/{mock_work_item.id}/claim", json=claim_payload)
    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_409_CONFLICT
    error = response.json()
    assert error["detail"]["your_version"] == 1
    assert error["detail"]["current_version"] == 2
