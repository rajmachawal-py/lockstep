"""
Idempotency Key Service.

Prevents duplicate operations when users double-click, retry on network
failure, or browsers replay timed-out requests. Critical mutations
(create, transition, claim) are protected by this middleware.

Mechanism:
1. Client sends an `Idempotency-Key` header with a UUID.
2. Server checks if the key+user combo already exists.
3. If yes → return the cached response (no re-execution).
4. If no → execute the operation, cache the result, return it.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID
from typing import Optional
import json
from datetime import datetime, timedelta, timezone


class IdempotencyResult:
    """Wrapper for a cached idempotency response."""
    def __init__(self, response_code: int, response_body: dict):
        self.response_code = response_code
        self.response_body = response_body


async def check_idempotency(
    db: AsyncSession,
    idempotency_key: str,
    user_id: UUID,
) -> Optional[IdempotencyResult]:
    """
    Check if an idempotency key has already been used by this user.
    Returns the cached response if found, None otherwise.
    """
    result = await db.execute(
        text("""
            SELECT response_code, response_body
            FROM public.idempotency_records
            WHERE key = :key AND user_id = :user_id
              AND created_at > :cutoff
        """),
        {
            "key": idempotency_key,
            "user_id": str(user_id),
            "cutoff": datetime.now(timezone.utc) - timedelta(minutes=30),
        },
    )
    row = result.fetchone()
    if row:
        return IdempotencyResult(
            response_code=row.response_code,
            response_body=row.response_body,
        )
    return None


async def store_idempotency(
    db: AsyncSession,
    idempotency_key: str,
    user_id: UUID,
    response_code: int,
    response_body: dict,
) -> None:
    """
    Store the result of an operation against its idempotency key.
    Subsequent requests with the same key return this cached result.
    """
    await db.execute(
        text("""
            INSERT INTO public.idempotency_records (key, user_id, response_code, response_body)
            VALUES (:key, :user_id, :response_code, :response_body::jsonb)
            ON CONFLICT (key, user_id) DO NOTHING
        """),
        {
            "key": idempotency_key,
            "user_id": str(user_id),
            "response_code": response_code,
            "response_body": json.dumps(response_body),
        },
    )
    await db.commit()


async def cleanup_expired_keys(db: AsyncSession) -> int:
    """
    Remove idempotency records older than 30 minutes.
    Should be called periodically (e.g., background task).
    Returns the number of deleted records.
    """
    result = await db.execute(
        text("""
            DELETE FROM public.idempotency_records
            WHERE created_at < :cutoff
        """),
        {"cutoff": datetime.now(timezone.utc) - timedelta(minutes=30)},
    )
    await db.commit()
    return result.rowcount
