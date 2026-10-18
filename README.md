# Newtonite Operations Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015+-3ECF8E.svg?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tests](https://img.shields.io/badge/Pytest-22%20Passing-brightgreen.svg?style=flat&logo=pytest&logoColor=white)](backend/tests)

An internal web application engineered specifically for **high-pressure, concurrent operational workflows** (incident response, triage, role-gated approvals, and team assignments), replacing disorganized multi-channel coordination (Slack threads, spreadsheets, emails) with mathematical certainty and transactional integrity.

---

## 🌟 5 Core Non-CRUD Operational Behaviors

Standard CRUD applications fail under operational concurrency. This platform solves 5 core pressure points:

| # | Operational Challenge | Engineering Solution | Behavior / Protocol |
|---|----------------------|----------------------|---------------------|
| **1** | **Simultaneous Ownership Claims** | Atomic Conditional Updates | `UPDATE work_items ... WHERE id = :id AND assignee_id IS NULL RETURNING id`. Loser immediately receives `409 Conflict` identifying the winning operator. |
| **2** | **Stale View Overwrite Protection** | Optimistic Concurrency Control (OCC) | Strictly incrementing `version` integer checked on mutations. Mismatches return `409 Conflict` with server record for visual diff reconciliation. |
| **3** | **Duplicate Request & Double-Clicks** | Idempotency Key Engine | Client provides `Idempotency-Key: <UUID>`. The backend caches responses in an idempotency store, returning identical responses on replays without re-executing logic. |
| **4** | **State Machine & RBAC Governance** | Role-Gated Transition Matrix | Validates valid workflow paths and role hierarchy (`member`, `lead`, `manager`). Rejections require reasons; resolutions require root-cause notes. |
| **5** | **Failure-Isolated Side Effects** | Asynchronous Event Workers | Core transitions commit synchronously within ACID transactions; notification dispatch & enrichment run asynchronously with dead-letter isolation. |

---

## 🏛️ System Architecture

```text
Newtonite Operations Management System
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route controllers (auth, work_items, teams)
│   │   ├── models/          # SQLAlchemy async models (WorkItem, Profile, Team, AuditLog)
│   │   ├── schemas/         # Pydantic v2 validation and serialization models
│   │   ├── services/        # Workflow engine, Idempotency store, Background workers
│   │   └── db/              # Async database engine & session dependency
│   └── tests/               # 22 async unit & integration tests (concurrency, OCC, RBAC, idempotency)
├── frontend/
│   ├── src/
│   │   ├── api/             # Fetch client with auto JWT and Idempotency injection
│   │   ├── components/
│   │   │   ├── triage/      # Triage board, metrics banner, filter bar
│   │   │   ├── detail/      # Detail drawer, role-gated action buttons, audit timeline
│   │   │   ├── forms/       # Incident dispatch modal with idempotency keys
│   │   │   └── common/      # Visual 409 conflict & diff reconciliation modal
│   │   └── lib/             # Supabase client & Realtime CDC WebSocket connection
├── supabase/
│   └── migrations/          # Schema (001), RLS Policies (002), Realistic Seed Data (003)
└── Docs/                    # Architectural decisions, specifications, and defense walkthroughs
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python**: 3.10+ (tested on Python 3.12)
- **Node.js**: 18+ (tested on Node v20/v22/v24)
- **Supabase Account**: PostgreSQL database with Auth and Realtime enabled.

---

### 2. Environment Configuration

#### Backend Environment
Copy the backend example file and populate your credentials:
```bash
cp backend/.env.example backend/.env
```
Inside `backend/.env`:
```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://postgres:your-db-password@db.your-project.supabase.co:5432/postgres
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173"]
```

#### Frontend Environment
Copy the frontend example file and populate your credentials:
```bash
cp frontend/.env.example frontend/.env.local
```
Inside `frontend/.env.local`:
```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 3. Database Migration & Seed

Execute the migrations in order using the Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql` (Creates `profiles`, `teams`, `team_members`, `work_items`, `audit_logs`, `idempotency_records`)
2. `supabase/migrations/002_rls_policies.sql` (Row-Level Security policies for multi-tenant team safety)
3. `supabase/migrations/003_seed_data.sql` (Seeds realistic operational users across teams with differing roles)

---

### 4. Running the Backend

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn app.main:app --reload --port 8000
```

- **API Base URL**: `http://localhost:8000`
- **Interactive OpenAPI (Swagger) Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

---

### 5. Running Automated Tests

The backend includes a comprehensive async test suite testing all 5 non-CRUD behaviors:

```bash
cd backend
pytest -v
```

**Test Suite Coverage (22 passing tests in ~0.15s):**
- `tests/test_concurrency.py`: Parallel atomic claims & race condition winner/loser verification.
- `tests/test_optimistic_locking.py`: OCC version checks, increments, and 409 conflict payload delivery.
- `tests/test_workflow_rbac.py`: Role gating, illegal transition rejection, required notes enforcement.
- `tests/test_idempotency.py`: Duplicate request replay and cached response return.

---

### 6. Running the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- **Web Application**: `http://localhost:5173`

---

## 🧪 How to Demo the 5 Non-CRUD Behaviors to Evaluators

1. **Test OCC Stale Updates (409 Conflict)**:
   - Open the web application.
   - Click on an item and open the "Edit (OCC)" drawer.
   - In another browser tab or via Swagger API, submit an update to the item to bump its version.
   - Now click "Save Changes" in your first tab.
   - Observe the **Optimistic Concurrency Conflict Modal**: shows your local version vs server version and the field-level diff without silently overwriting server data.

2. **Test Atomic Claims (Race Conditions)**:
   - Find an unclaimed item in the triage board.
   - Attempt simultaneous claims (or run `pytest tests/test_concurrency.py`).
   - The winner claims the item; the competitor receives an immediate 409 Conflict showing who won the claim.

3. **Test Role-Gated State Machine**:
   - In the top header bar, switch the **Testing Role** selector between:
     - `Alex Member (MEMBER)`
     - `Sam Lead (LEAD)`
     - `Morgan Manager (MANAGER)`
   - As a `Member`, notice you cannot approve items in `pending_approval` (no approval button is rendered, and direct API calls return 403 Forbidden).
   - Switch to `Lead` or `Manager` to approve or reject items with required justification notes.

4. **Test Idempotency**:
   - Submitting incident dispatches automatically attaches a client-generated UUID `Idempotency-Key` header.
   - Retries or network double-clicks replay the exact same response without creating duplicate database rows.

---

## 📚 Technical Documentation

All detailed project documents are tracked in the `Docs/` directory:
- [Docs/ENGINEERING_DECISIONS.md](Docs/ENGINEERING_DECISIONS.md): Architectural decisions, alternatives evaluated, trade-offs accepted.
- [Docs/CANDIDATE_WALKTHROUGH.md](Docs/CANDIDATE_WALKTHROUGH.md): Defense notes and evaluator presentation guide.

---

