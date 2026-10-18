"""
Tests for Atomic Claim Race Conditions and Concurrency.

Demonstrates that under concurrent claim attempts on an unclaimed work item:
1. The atomic conditional SQL update:
   UPDATE work_items SET assignee_id = :uid WHERE id = :id AND assignee_id IS NULL RETURNING id
   guarantees exactly ONE claimant succeeds.
2. The concurrent competitor receives HTTP 409 Conflict, identifying the winning claimant.
3. Neither user can overwrite or double-assign the work item.
"""

import pytest
import asyncio
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from fastapi import status

from app.main import app
from app.dependencies import get_current_user, get_db
from app.models.work_item import WorkItem, WorkItemStatus, WorkItemPriority, WorkItemCategory
from app.models.team import TeamRole


@pytest.mark.asyncio
async def test_atomic_claim_winner_and_loser(async_client, mock_work_item, mock_user_member, mock_user_lead):
    """
    Simulate two concurrent claim requests arriving at the database:
    - User 1's query executes when assignee_id IS NULL -> returns row id -> SUCCESS (200)
    - User 2's query executes when assignee_id IS ALREADY User 1 -> returns None -> CONFLICT (409)
    """
    # ── 1. User 1 Claims successfully ──
    mock_db_user1 = AsyncMock()
    mock_result1 = MagicMock()
    mock_result1.scalar_one_or_none.return_value = mock_work_item

    role_result1 = MagicMock()
    role_result1.scalar_one_or_none.return_value = TeamRole.member

    # SQL RETURNING returns the row for user 1
    claim_returning1 = MagicMock()
    claim_returning1.fetchone.return_value = MagicMock(id=mock_work_item.id)

    # Post-claim refreshed item
    refreshed_item1 = MagicMock()
    refreshed_item1.scalar_one.return_value = mock_work_item

    mock_db_user1.execute.side_effect = [
        mock_result1,       # select WorkItem
        role_result1,       # require_team_membership
        claim_returning1,   # atomic UPDATE ... RETURNING id
        refreshed_item1,    # select WorkItem after commit
    ]

    app.dependency_overrides[get_db] = lambda: mock_db_user1
    app.dependency_overrides[get_current_user] = lambda: mock_user_member

    resp1 = await async_client.post(
        f"/api/v1/work-items/{mock_work_item.id}/claim",
        json={"version": 1},
    )
    assert resp1.status_code == status.HTTP_200_OK

    # Now assign user 1 to the item
    mock_work_item.assignee_id = mock_user_member.id
    mock_work_item.assignee = mock_user_member
    mock_work_item.status = WorkItemStatus.in_investigation
    mock_work_item.version = 2

    # ── 2. User 2 (Lead) tries to claim simultaneously ──
    mock_db_user2 = AsyncMock()
    mock_result2 = MagicMock()
    mock_result2.scalar_one_or_none.return_value = mock_work_item

    role_result2 = MagicMock()
    role_result2.scalar_one_or_none.return_value = TeamRole.lead

    # User 2's atomic UPDATE returns None because assignee_id IS NULL evaluated to False
    claim_returning2 = MagicMock()
    claim_returning2.fetchone.return_value = None

    mock_db_user2.execute.side_effect = [
        mock_result2,       # select WorkItem
        role_result2,       # require_team_membership
        claim_returning2,   # atomic UPDATE ... RETURNING id -> returns None
    ]

    app.dependency_overrides[get_db] = lambda: mock_db_user2
    app.dependency_overrides[get_current_user] = lambda: mock_user_lead

    resp2 = await async_client.post(
        f"/api/v1/work-items/{mock_work_item.id}/claim",
        json={"version": 1},  # User 2 also read when version was 1
    )
    app.dependency_overrides.clear()

    # User 2 must receive 409 Conflict
    assert resp2.status_code == status.HTTP_409_CONFLICT
    err_body = resp2.json()
    assert "already been claimed" in err_body["detail"]["message"] or "Conflict" in err_body["detail"]["message"]


@pytest.mark.asyncio
async def test_claim_already_assigned_item_fails(async_client, mock_work_item, mock_user_member, mock_user_lead):
    """
    Attempting to claim an item that already has an assignee returns 409 immediately.
    """
    mock_work_item.assignee_id = mock_user_member.id
    mock_work_item.assignee = mock_user_member
    mock_work_item.status = WorkItemStatus.in_investigation
    mock_work_item.version = 2

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_work_item

    role_result = MagicMock()
    role_result.scalar_one_or_none.return_value = TeamRole.member

    # Atomic claim returns 0 rows updated
    claim_ret = MagicMock()
    claim_ret.fetchone.return_value = None

    mock_db.execute.side_effect = [
        mock_result,
        role_result,
        claim_ret,
    ]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user_lead

    response = await async_client.post(
        f"/api/v1/work-items/{mock_work_item.id}/claim",
        json={"version": 2},
    )
    app.dependency_overrides.clear()

    assert response.status_code == status.HTTP_409_CONFLICT
    assert f"claimed by {mock_user_member.full_name}" in response.json()["detail"]["message"]
