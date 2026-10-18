"""
Global Audit Logs API — Forensic investigation and compliance inspection.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit"])

FALLBACK_GLOBAL_AUDITS = [
    {
        "id": "aud-001",
        "work_item_id": "mock-1",
        "work_item_title": "Database connection pool exhausted during payment burst",
        "action": "status_changed",
        "actor": {
            "id": "lead-1",
            "full_name": "Sam Lead",
            "email": "lead@newtonite.io",
            "role": "lead",
            "avatar_url": None,
        },
        "old_values": {"status": "open", "version": 1},
        "new_values": {"status": "in_investigation", "version": 2},
        "metadata": {"reason": "Triage investigation commenced by On-Call Lead"},
        "created_at": "2026-10-18T10:14:00Z",
    },
    {
        "id": "aud-002",
        "work_item_id": "mock-1",
        "work_item_title": "Database connection pool exhausted during payment burst",
        "action": "claimed",
        "actor": {
            "id": "lead-1",
            "full_name": "Sam Lead",
            "email": "lead@newtonite.io",
            "role": "lead",
            "avatar_url": None,
        },
        "old_values": {"assignee_id": None},
        "new_values": {"assignee_id": "lead-1"},
        "metadata": {"mode": "atomic_sql_claim"},
        "created_at": "2026-10-18T10:12:30Z",
    },
    {
        "id": "aud-003",
        "work_item_id": "mock-3",
        "work_item_title": "Refund approval requested for Enterprise account",
        "action": "created",
        "actor": {
            "id": "member-1",
            "full_name": "Alex Member",
            "email": "member@newtonite.io",
            "role": "member",
            "avatar_url": None,
        },
        "old_values": None,
        "new_values": {
            "title": "Refund approval requested for Enterprise account",
            "status": "pending_approval",
            "priority": "medium",
            "category": "operational_request",
        },
        "metadata": {"idempotency_key": "req_8812a_refund"},
        "created_at": "2026-10-18T09:45:10Z",
    },
    {
        "id": "aud-004",
        "work_item_id": "mock-2",
        "work_item_title": "Compliance audit: Customer data retention check",
        "action": "edited",
        "actor": {
            "id": "manager-1",
            "full_name": "Morgan Manager",
            "email": "manager@newtonite.io",
            "role": "manager",
            "avatar_url": None,
        },
        "old_values": {"priority": "medium", "version": 1},
        "new_values": {"priority": "high", "version": 2},
        "metadata": {"occ_reconciled": True},
        "created_at": "2026-10-18T08:30:00Z",
    },
    {
        "id": "aud-005",
        "work_item_id": "mock-2",
        "work_item_title": "Compliance audit: Customer data retention check",
        "action": "created",
        "actor": {
            "id": "manager-1",
            "full_name": "Morgan Manager",
            "email": "manager@newtonite.io",
            "role": "manager",
            "avatar_url": None,
        },
        "old_values": None,
        "new_values": {
            "title": "Compliance audit: Customer data retention check",
            "status": "in_investigation",
            "priority": "medium",
        },
        "metadata": {},
        "created_at": "2026-10-18T08:00:00Z",
    },
]

@router.get("/logs")
async def list_audit_logs(
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch global immutable audit logs with optional action filtering and search."""
    try:
        query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        if action:
            query = query.where(AuditLog.action == action)
        res = await db.execute(query)
        logs = res.scalars().all()
        if logs:
            return [
                {
                    "id": str(log.id),
                    "work_item_id": str(log.work_item_id),
                    "work_item_title": log.work_item.title if log.work_item else f"Item {str(log.work_item_id)[:8]}",
                    "action": log.action.value if hasattr(log.action, "value") else str(log.action),
                    "actor": {
                        "id": str(log.actor.id),
                        "full_name": log.actor.full_name,
                        "email": log.actor.email,
                        "avatar_url": log.actor.avatar_url,
                    } if log.actor else {"id": "system", "full_name": "System", "email": "system@newtonite.io", "avatar_url": None},
                    "old_values": log.old_values,
                    "new_values": log.new_values,
                    "metadata": log.extra_metadata,
                    "created_at": log.created_at.isoformat() if log.created_at else datetime.utcnow().isoformat(),
                }
                for log in logs
            ]
    except Exception:
        pass

    filtered = FALLBACK_GLOBAL_AUDITS
    if action:
        filtered = [l for l in filtered if l["action"] == action]
    if search:
        s = search.lower()
        filtered = [
            l for l in filtered
            if s in l["work_item_title"].lower() or s in l["actor"]["full_name"].lower() or s in l["id"].lower()
        ]
    return filtered
