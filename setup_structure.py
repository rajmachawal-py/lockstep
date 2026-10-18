"""
Project Structure Generator for Newtonite Operations Management System.
Run this script to initialize the complete backend, frontend, and database directory structure.
"""

from pathlib import Path

# Base directory is the current directory (software_engineering_challenge)
BASE_DIR = Path(__file__).resolve().parent

# Define directories to create
DIRECTORIES = [
    # Backend structure
    BASE_DIR / "backend" / "app" / "api",
    BASE_DIR / "backend" / "app" / "models",
    BASE_DIR / "backend" / "app" / "schemas",
    BASE_DIR / "backend" / "app" / "services",
    BASE_DIR / "backend" / "app" / "db",
    BASE_DIR / "backend" / "tests",

    # Frontend structure
    BASE_DIR / "frontend" / "public",
    BASE_DIR / "frontend" / "src" / "api",
    BASE_DIR / "frontend" / "src" / "lib",
    BASE_DIR / "frontend" / "src" / "components" / "common",
    BASE_DIR / "frontend" / "src" / "components" / "layout",
    BASE_DIR / "frontend" / "src" / "components" / "triage",
    BASE_DIR / "frontend" / "src" / "components" / "detail",
    BASE_DIR / "frontend" / "src" / "components" / "forms",
    BASE_DIR / "frontend" / "src" / "types",

    # Supabase migrations & seed scripts
    BASE_DIR / "supabase" / "migrations",

    # Documentation folder (already exists, but kept for completeness)
    BASE_DIR / "Docs",
]

# Define files with initial scaffolding content
FILES = {
    BASE_DIR / ".gitignore": """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
.pytest_cache/
.coverage
htmlcov/

# Node / React
node_modules/
dist/
dist-ssr/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment secrets
.env
.env.local
.env.*.local
*.pem
*.key

# IDE & OS
.idea/
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db
""",

    BASE_DIR / "README.md": """# Newtonite Operations Management System

An operational coordination and incident management platform engineered for high-pressure, concurrent multi-user environments.

## Features
- **Atomic Ownership Claims**: Prevents race conditions when multiple users attempt to claim the same work item simultaneously.
- **Optimistic Concurrency Control (OCC)**: Detects stale data and prevents silent overwrites with automatic 409 Conflict handling.
- **Strict Role-Gated State Machine**: Transition validation ensuring compliance and operational governance (RBAC).
- **Idempotency Key Handling**: Protects against accidental duplicate operations from network drops or multi-clicking.
- **Resilient Background Processing**: Asynchronous side-effects (audit logs, webhook notifications) with failure isolation.

## Architecture
- **Backend**: Python (FastAPI, Pydantic v2, asyncpg / SQLAlchemy Async)
- **Database**: Supabase PostgreSQL (Row-Level Security, Realtime CDC)
- **Frontend**: React (Vite, TypeScript, TanStack Query)

## Setup & Running Instructions
See documentation in `Docs/` for setup and architecture details:
- `Docs/implementation_plan.md`: Full phased plan and technical specifications.
- `Docs/ENGINEERING_DECISIONS.md`: The 5 core architectural trade-offs and decisions.
""",

    # Backend initialization
    BASE_DIR / "backend" / "requirements.txt": """fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
pydantic-settings>=2.2.0
sqlalchemy[asyncio]>=2.0.28
asyncpg>=0.29.0
supabase>=2.3.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
httpx>=0.27.0
pytest>=8.1.0
pytest-asyncio>=0.23.0
""",

    BASE_DIR / "backend" / ".env.example": """# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://postgres:your-db-password@db.your-project.supabase.co:5432/postgres

# App Settings
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173"]
""",

    BASE_DIR / "backend" / "app" / "__init__.py": "",
    BASE_DIR / "backend" / "app" / "api" / "__init__.py": "",
    BASE_DIR / "backend" / "app" / "models" / "__init__.py": "",
    BASE_DIR / "backend" / "app" / "schemas" / "__init__.py": "",
    BASE_DIR / "backend" / "app" / "services" / "__init__.py": "",
    BASE_DIR / "backend" / "app" / "db" / "__init__.py": "",
    BASE_DIR / "backend" / "tests" / "__init__.py": "",

    # Frontend environment example
    BASE_DIR / "frontend" / ".env.example": """VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
""",

    # Supabase initial SQL placeholder
    BASE_DIR / "supabase" / "migrations" / "001_initial_schema.sql": """-- Newtonite Initial Schema: Work Items, Teams, Profiles, Audits
-- To be executed in Supabase SQL Editor
""",
}


def create_structure():
    print(f"Creating project structure in: {BASE_DIR}")

    # 1. Create directories
    for directory in DIRECTORIES:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"  [DIR]  {directory.relative_to(BASE_DIR)}")

    # 2. Create files
    for file_path, content in FILES.items():
        # Do not overwrite if file already exists with content
        if file_path.exists() and file_path.stat().st_size > 0:
            print(f"  [SKIP] {file_path.relative_to(BASE_DIR)} (already exists)")
            continue

        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content.strip() + "\n", encoding="utf-8")
        print(f"  [FILE] {file_path.relative_to(BASE_DIR)}")

    print("\nProject structure initialized successfully!")


if __name__ == "__main__":
    create_structure()
