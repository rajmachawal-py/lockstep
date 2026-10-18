"""
Auth API — Proxies Supabase Auth for signup, login, and current user info.
The frontend can also call Supabase Auth directly; these endpoints provide
a unified API surface through our backend.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import create_client

from app.config import settings
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import Profile

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Supabase client (using service role for admin operations)
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(payload: SignupRequest):
    """
    Register a new user via Supabase Auth.
    The handle_new_user trigger auto-creates the profile row.
    """
    try:
        result = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "full_name": payload.full_name,
                }
            }
        })

        if result.user:
            return {
                "message": "User created successfully",
                "user_id": str(result.user.id),
                "email": result.user.email,
            }
        else:
            raise HTTPException(status_code=400, detail="Signup failed")

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(payload: LoginRequest):
    """
    Authenticate a user and return JWT tokens.
    """
    try:
        # Use the anon client for login (not service role)
        anon_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        result = anon_client.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password,
        })

        if result.session:
            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
                "token_type": "bearer",
                "expires_in": result.session.expires_in,
                "user": {
                    "id": str(result.user.id),
                    "email": result.user.email,
                    "full_name": result.user.user_metadata.get("full_name", ""),
                },
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def get_me(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated user's profile and team memberships."""
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "teams": [
            {
                "team_id": tm.team_id,
                "team_name": tm.team.name if tm.team else None,
                "role": tm.role.value,
            }
            for tm in current_user.team_memberships
        ],
    }
