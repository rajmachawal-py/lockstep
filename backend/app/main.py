"""
Newtonite Operations Management System — FastAPI Application Entrypoint.

Run with: uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import auth, work_items, teams

# ── Create FastAPI App ──────────────────────────────────────

app = FastAPI(
    title="Newtonite Ops Manager",
    description=(
        "Operational coordination and incident management platform. "
        "Engineered for concurrent multi-user workflows under pressure."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ─────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount API Routers ──────────────────────────────────────

app.include_router(auth.router, prefix="/api/v1")
app.include_router(work_items.router, prefix="/api/v1")
app.include_router(teams.router, prefix="/api/v1")


# ── Health Check ────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "newtonite-ops-manager"}


@app.get("/", tags=["Root"])
async def root():
    """API root — redirects to docs."""
    return {
        "service": "Newtonite Operations Management System",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
