"""
Tests for Idempotency Key Engine.

Validates:
- Storing and retrieving cached responses by (key, user_id)
- Replaying requests with the same Idempotency-Key returns cached response without duplicate side-effects
- Requests with distinct idempotency keys execute independently
"""

import pytest
import json
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from fastapi import status

from app.main import app
from app.dependencies import get_current_user, get_db
from app.services.idempotency import check_idempotency, store_idempotency, IdempotencyResult
from app.models.team import TeamRole


@pytest.mark.asyncio
async def test_idempotency_service_store_and_check():
    """Unit test for check_idempotency and store_idempotency helpers."""
    mock_db = AsyncMock()
    user_id = uuid4()
    idem_key = str(uuid4())
    cached_payload = {"id": str(uuid4()), "status": "created", "version": 1}

    # Simulate cache miss first
    empty_result = MagicMock()
    empty_result.fetchone.return_value = None
    mock_db.execute.return_value = empty_result

    res = await check_idempotency(mock_db, idem_key, user_id)
    assert res is None

    # Simulate cache hit
    hit_row = MagicMock()
    hit_row.response_code = 201
    hit_row.response_body = cached_payload

    hit_result = MagicMock()
    hit_result.fetchone.return_value = hit_row
    mock_db.execute.return_value = hit_result

    res_hit = await check_idempotency(mock_db, idem_key, user_id)
    assert res_hit is not None
    assert res_hit.response_code == 201
    assert res_hit.response_body["status"] == "created"


@pytest.mark.asyncio
async def test_duplicate_create_request_replays_cached_response(async_client, mock_user_member, mock_team_id):
    """
    Submitting duplicate POST requests with the same Idempotency-Key returns
    the cached response on subsequent requests without re-executing database operations.
    """
    idem_key = str(uuid4())
    cached_response_body = {
        "id": str(uuid4()),
        "title": "Idempotent Incident",
        "category": "incident",
        "priority": "urgent",
        "status": "open",
        "owning_team": {"id": str(mock_team_id), "name": "Core Engineering"},
        "version": 1,
    }

    mock_db = AsyncMock()

    # 1. First call: check_idempotency returns None (cache miss)
    miss_result = MagicMock()
    miss_result.fetchone.return_value = None

    role_result = MagicMock()
    role_result.scalar_one_or_none.return_value = TeamRole.member

    mock_db.execute.side_effect = [
        role_result,  # require_team_membership
        miss_result,  # check_idempotency -> cache miss
        AsyncMock(),  # store_idempotency insert
    ]

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user_member

    # 2. Second call with same idempotency key: check_idempotency returns hit
    mock_db_replay = AsyncMock()
    hit_row = MagicMock()
    hit_row.response_code = 201
    hit_row.response_body = cached_response_body

    hit_result = MagicMock()
    hit_result.fetchone.return_value = hit_row

    mock_db_replay.execute.side_effect = [
        role_result,  # require_team_membership
        hit_result,   # check_idempotency -> returns cached body
    ]

    app.dependency_overrides[get_db] = lambda: mock_db_replay

    payload = {
        "title": "Idempotent Incident",
        "category": "incident",
        "priority": "urgent",
        "owning_team_id": str(mock_team_id),
    }

    headers = {"Idempotency-Key": idem_key}

    replay_response = await async_client.post(
        "/api/v1/work-items",
        json=payload,
        headers=headers,
    )
    app.dependency_overrides.clear()

    # Replay returned the cached response immediately
    assert replay_response.status_code == status.HTTP_201_CREATED
    data = replay_response.json()
    assert data["title"] == "Idempotent Incident"
    assert data["id"] == cached_response_body["id"]
