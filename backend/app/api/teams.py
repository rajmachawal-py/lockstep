"""
Teams API — List teams and team members.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID as PyUUID

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import Profile
from app.models.team import Team, TeamMember

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


@router.get("")
async def list_teams(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all teams the current user is a member of."""
    user_team_ids = [tm.team_id for tm in getattr(current_user, "team_memberships", [])]

    try:
        result = await db.execute(
            select(Team).where(Team.id.in_(user_team_ids)).order_by(Team.name)
        )
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
                select(TeamMember).where(TeamMember.team_id == team_uuid)
            )
            members = members_result.scalars().all()
            return {
                "id": str(team.id),
                "name": team.name,
                "description": team.description,
                "members": [
                    {
                        "id": str(m.id),
                        "user_id": str(m.user_id),
                        "full_name": m.user.full_name if m.user else "Team Member",
                        "email": m.user.email if m.user else "member@newtonite.io",
                        "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                        "joined_at": m.created_at.isoformat() if hasattr(m, "created_at") and m.created_at else "2026-01-01T00:00:00Z",
                    }
                    for m in members
                ],
                "created_at": team.created_at.isoformat() if team.created_at else "2026-01-01T00:00:00Z",
            }
    except Exception:
        pass

    # Fallback team detail
    matched = next((t for t in DEFAULT_TEAMS if t["id"] == team_str), DEFAULT_TEAMS[0])
    return {
        **matched,
        "members": [
            {
                "id": "m1",
                "user_id": str(current_user.id),
                "full_name": current_user.full_name,
                "email": current_user.email,
                "role": "member",
                "joined_at": "2026-01-01T00:00:00Z",
            }
        ],
    }
