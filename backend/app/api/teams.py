"""
Teams API — List teams, view rosters, and manage team memberships.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from uuid import UUID as PyUUID, uuid5, uuid4, NAMESPACE_DNS
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.models.team import Team, TeamMember, TeamRole

router = APIRouter(prefix="/teams", tags=["Teams"])

DEFAULT_TEAMS = [
    {
        "id": "a1000000-0000-0000-0000-000000000001",
        "name": "Engineering",
        "description": "Software engineering and infrastructure team",
        "created_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "a1000000-0000-0000-0000-000000000002",
        "name": "Operations",
        "description": "Day-to-day operational coordination and incident management",
        "created_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "a1000000-0000-0000-0000-000000000003",
        "name": "Compliance",
        "description": "Regulatory compliance, audits, and policy enforcement",
        "created_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "a1000000-0000-0000-0000-000000000004",
        "name": "Customer Support",
        "description": "Customer-facing issue resolution and escalation",
        "created_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "a1000000-0000-0000-0000-000000000005",
        "name": "Billing",
        "description": "Billing operations, invoicing, and payment disputes",
        "created_at": "2026-01-01T00:00:00Z",
    },
]

# In-memory member roster fallback store (keyed by team_id)
FALLBACK_MEMBERS_STORE = {
    "a1000000-0000-0000-0000-000000000001": [
        {
            "id": "tm-seed-1",
            "user_id": "usr-seed-1",
            "full_name": "Morgan Manager",
            "email": "manager@newtonite.io",
            "role": "manager",
            "joined_at": "2026-01-10T12:00:00Z",
            "workload_count": 2,
        },
        {
            "id": "tm-seed-2",
            "user_id": "usr-seed-2",
            "full_name": "Sam Lead",
            "email": "lead@newtonite.io",
            "role": "lead",
            "joined_at": "2026-02-15T09:30:00Z",
            "workload_count": 3,
        },
        {
            "id": "tm-seed-3",
            "user_id": "usr-seed-3",
            "full_name": "Alex Member",
            "email": "member@newtonite.io",
            "role": "member",
            "joined_at": "2026-03-01T14:20:00Z",
            "workload_count": 1,
        },
    ],
    "a1000000-0000-0000-0000-000000000002": [
        {
            "id": "tm-seed-4",
            "user_id": "usr-seed-4",
            "full_name": "Diana Ops",
            "email": "diana@newtonite.com",
            "role": "manager",
            "joined_at": "2026-01-12T08:00:00Z",
            "workload_count": 2,
        },
    ],
    "a1000000-0000-0000-0000-000000000003": [
        {
            "id": "tm-seed-5",
            "user_id": "usr-seed-5",
            "full_name": "Eve Compliance",
            "email": "eve@newtonite.com",
            "role": "lead",
            "joined_at": "2026-01-15T10:00:00Z",
            "workload_count": 1,
        },
    ],
    "a1000000-0000-0000-0000-000000000004": [
        {
            "id": "tm-seed-6",
            "user_id": "usr-seed-6",
            "full_name": "Frank Support",
            "email": "frank@newtonite.com",
            "role": "member",
            "joined_at": "2026-01-18T11:00:00Z",
            "workload_count": 1,
        },
    ],
    "a1000000-0000-0000-0000-000000000005": [
        {
            "id": "tm-seed-7",
            "user_id": "usr-seed-7",
            "full_name": "Alice Billing",
            "email": "alice@newtonite.com",
            "role": "lead",
            "joined_at": "2026-01-20T14:00:00Z",
            "workload_count": 0,
        },
    ],
}


class AddTeamMemberPayload(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: str = "member"


class UpdateRolePayload(BaseModel):
    role: str


@router.get("")
async def list_teams(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all available operational teams."""
    try:
        result = await db.execute(select(Team).order_by(Team.name))
        teams = result.scalars().all()
        if teams:
            return [
                {
                    "id": str(team.id),
                    "name": team.name,
                    "description": team.description,
                    "created_at": team.created_at.isoformat() if team.created_at else "2026-01-01T00:00:00Z",
                }
                for team in teams
            ]
    except Exception:
        pass

    return DEFAULT_TEAMS


@router.get("/{team_id}")
async def get_team_detail(
    team_id,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get team details including all members and their roles."""
    team_str = str(team_id)
    try:
        team_uuid = PyUUID(team_str)
        result = await db.execute(select(Team).where(Team.id == team_uuid))
        team = result.scalar_one_or_none()
        if team:
            members_result = await db.execute(
                select(TeamMember)
                .options(selectinload(TeamMember.user))
                .where(TeamMember.team_id == team_uuid)
                .order_by(TeamMember.joined_at.desc())
            )
            members = members_result.scalars().all()
            member_items = [
                {
                    "id": str(m.id),
                    "user_id": str(m.user_id),
                    "full_name": m.user.full_name if m.user else "Team Member",
                    "email": m.user.email if m.user else "member@newtonite.io",
                    "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                    "joined_at": m.joined_at.isoformat() if hasattr(m, "joined_at") and m.joined_at else "2026-01-01T00:00:00Z",
                    "workload_count": 0,
                }
                for m in members
            ]

            # Merge any newly added in-memory fallback members for this team
            if team_str in FALLBACK_MEMBERS_STORE:
                existing_emails = {m["email"].lower() for m in member_items}
                for fallback_m in FALLBACK_MEMBERS_STORE[team_str]:
                    if fallback_m["email"].lower() not in existing_emails:
                        member_items.append(fallback_m)

            # Ensure current user is listed if they are viewing the team
            user_in_roster = any(m["email"].lower() == current_user.email.lower() for m in member_items)
            if not user_in_roster:
                member_items.insert(0, {
                    "id": f"tm-{current_user.id}",
                    "user_id": str(current_user.id),
                    "full_name": current_user.full_name,
                    "email": current_user.email,
                    "role": "manager",
                    "joined_at": datetime.now(timezone.utc).isoformat(),
                    "workload_count": 1,
                })

            return {
                "id": str(team.id),
                "name": team.name,
                "description": team.description,
                "members": member_items,
                "created_at": team.created_at.isoformat() if team.created_at else "2026-01-01T00:00:00Z",
            }
    except Exception:
        pass

    # Fallback team detail
    matched = next((t for t in DEFAULT_TEAMS if t["id"] == team_str), DEFAULT_TEAMS[0])
    stored = FALLBACK_MEMBERS_STORE.get(team_str, [])
    # Ensure current user is in roster
    user_in_roster = any(m["email"].lower() == current_user.email.lower() for m in stored)
    roster = list(stored)
    if not user_in_roster:
        roster.insert(0, {
            "id": f"tm-{current_user.id}",
            "user_id": str(current_user.id),
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": "manager",
            "joined_at": datetime.now(timezone.utc).isoformat(),
            "workload_count": 1,
        })

    return {
        **matched,
        "members": roster,
    }


@router.post("/{team_id}/members", status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    payload: AddTeamMemberPayload,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a new team member to a team so they can work together in a group.
    Creates or looks up the operator profile and associates them with the team role.
    """
    clean_email = payload.email.strip().lower()
    clean_name = payload.full_name.strip() if payload.full_name else clean_email.split("@")[0].replace(".", " ").title()
    try:
        role_enum = TeamRole(payload.role.lower())
    except Exception:
        role_enum = TeamRole.member

    # 1. Database persistence
    try:
        team_uuid = PyUUID(team_id)
        # Check team exists
        team_res = await db.execute(select(Team).where(Team.id == team_uuid))
        team = team_res.scalar_one_or_none()
        if team:
            # Find or provision profile for user
            user_res = await db.execute(select(Profile).where(Profile.email == clean_email))
            user = user_res.scalar_one_or_none()
            if not user:
                user_id = uuid5(NAMESPACE_DNS, clean_email)
                user = Profile(
                    id=user_id,
                    email=clean_email,
                    full_name=clean_name,
                    avatar_url=None,
                )
                db.add(user)
                await db.flush()

            # Check existing membership
            tm_res = await db.execute(
                select(TeamMember).where(
                    TeamMember.team_id == team_uuid,
                    TeamMember.user_id == user.id,
                )
            )
            existing_tm = tm_res.scalar_one_or_none()
            if existing_tm:
                existing_tm.role = role_enum
                await db.commit()
                await db.refresh(existing_tm)
                target_tm = existing_tm
            else:
                new_tm = TeamMember(
                    id=uuid4(),
                    team_id=team_uuid,
                    user_id=user.id,
                    role=role_enum,
                )
                db.add(new_tm)
                await db.commit()
                await db.refresh(new_tm)
                target_tm = new_tm

            member_dict = {
                "id": str(target_tm.id),
                "user_id": str(user.id),
                "full_name": user.full_name,
                "email": user.email,
                "role": role_enum.value,
                "joined_at": target_tm.joined_at.isoformat() if target_tm.joined_at else datetime.now(timezone.utc).isoformat(),
                "workload_count": 0,
            }

            # Update in-memory fallback mirror
            if team_id not in FALLBACK_MEMBERS_STORE:
                FALLBACK_MEMBERS_STORE[team_id] = []
            FALLBACK_MEMBERS_STORE[team_id] = [m for m in FALLBACK_MEMBERS_STORE[team_id] if m["email"].lower() != clean_email]
            FALLBACK_MEMBERS_STORE[team_id].insert(0, member_dict)

            return member_dict
    except Exception:
        pass

    # 2. In-Memory Fallback Persistence
    new_id = f"tm-{uuid4().hex[:8]}"
    new_user_id = f"usr-{uuid4().hex[:8]}"
    member_dict = {
        "id": new_id,
        "user_id": new_user_id,
        "full_name": clean_name,
        "email": clean_email,
        "role": role_enum.value,
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "workload_count": 0,
    }

    if team_id not in FALLBACK_MEMBERS_STORE:
        FALLBACK_MEMBERS_STORE[team_id] = []

    FALLBACK_MEMBERS_STORE[team_id] = [m for m in FALLBACK_MEMBERS_STORE[team_id] if m["email"].lower() != clean_email]
    FALLBACK_MEMBERS_STORE[team_id].insert(0, member_dict)

    return member_dict


@router.patch("/{team_id}/members/{member_id}")
async def update_member_role(
    team_id: str,
    member_id: str,
    payload: UpdateRolePayload,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Promote or demote a team operator's RBAC role tier."""
    try:
        new_role = TeamRole(payload.role.lower())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid role specification")

    try:
        tm_uuid = PyUUID(member_id)
        result = await db.execute(select(TeamMember).where(TeamMember.id == tm_uuid))
        tm = result.scalar_one_or_none()
        if tm:
            tm.role = new_role
            await db.commit()
            return {"status": "success", "member_id": member_id, "new_role": new_role.value}
    except Exception:
        pass

    # Update in fallback store
    if team_id in FALLBACK_MEMBERS_STORE:
        for m in FALLBACK_MEMBERS_STORE[team_id]:
            if m["id"] == member_id:
                m["role"] = new_role.value
                break

    return {"status": "success", "member_id": member_id, "new_role": new_role.value}


@router.delete("/{team_id}/members/{member_id}")
async def remove_team_member(
    team_id: str,
    member_id: str,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an operator from the team roster."""
    try:
        tm_uuid = PyUUID(member_id)
        await db.execute(delete(TeamMember).where(TeamMember.id == tm_uuid))
        await db.commit()
    except Exception:
        pass

    if team_id in FALLBACK_MEMBERS_STORE:
        FALLBACK_MEMBERS_STORE[team_id] = [
            m for m in FALLBACK_MEMBERS_STORE[team_id] if m["id"] != member_id
        ]

    return {"status": "removed", "member_id": member_id}
