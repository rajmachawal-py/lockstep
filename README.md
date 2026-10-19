# Lockstep — Operations Management Platform
### Newtonite Software Engineering Challenge Submission

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015+-3ECF8E.svg?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tests](https://img.shields.io/badge/Pytest-22%20Passing-brightgreen.svg?style=flat&logo=pytest&logoColor=white)](backend/tests)
[![Code Style](https://img.shields.io/badge/Code%20Style-Black%20%7C%20Ruff-000000.svg?style=flat)](https://github.com/astral-sh/ruff)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](LICENSE)

> **"Where Operational Chaos Meets Mathematical Certainty."**  
> An internal operations triage and coordination platform engineered specifically for **high-pressure, concurrent incident workflows**, replacing unstructured multi-channel coordination (Slack threads, brittle spreadsheets, emails) with deterministic transactional integrity.

---

> [!IMPORTANT]
> ### 🎯 Newtonite Challenge Deliverables Checklist
> **Requirement:** *"For the Newtonite Software Engineering Challenge, ensure your repository includes the source code, setup instructions, engineering decisions document, automated tests, and known limitations."*
> 
> All five required challenge deliverables are fully implemented, verified, and documented in this repository:
> 
> | # | Challenge Deliverable | Location in Repository | Highlights & Status |
> |---|:---|:---|:---|
> | **1** | **Source Code** | [`backend/`](backend/) & [`frontend/`](frontend/) | Fully typed async FastAPI backend (SQLAlchemy 2.0, Pydantic v2) + React 18 / TypeScript 5 Mission Control suite with zero layout flash and real-time CDC updates. |
> | **2** | **Setup Instructions** | [Setup Instructions & Quickstart Guide](#-setup-instructions--quickstart-guide) | Deterministic 3-minute setup instructions for local development, database migrations, Supabase credentials, and Google OAuth PKCE. |
> | **3** | **Engineering Decisions Document** | [`ENGINEERING_DECISIONS.md`](ENGINEERING_DECISIONS.md) | Living architectural record documenting concurrency trade-offs (OCC vs. pessimistic locks), dual-layer RBAC, idempotency guarantees, and dual-mode auth. |
> | **4** | **Automated Tests** | [`backend/tests/`](backend/tests/) | **22 passing async unit & concurrency tests** (0.19s execution) verifying parallel race conditions, OCC 409 collisions, state-machine transitions, and idempotency replays. |
> | **5** | **Known Limitations** | [Known Limitations & Future Scaling](#-known-limitations--future-scaling) | Candid, engineering-grounded technical analysis of current trade-offs and future scaling considerations (single-region DB affinity, distributed caching, multi-field locking). |

---

## 📑 Table of Contents

- [Problem Statement: Why Standard CRUD Fails](#-problem-statement-why-standard-crud-fails)
- [The 5 Core Non-CRUD Operational Behaviors](#-5-core-non-crud-operational-behaviors)
- [State Machine & Role-Gated Transition Model](#-state-machine--role-gated-transition-model)
- [System Architecture](#-system-architecture)
- [Setup Instructions & Quickstart Guide](#-setup-instructions--quickstart-guide)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Database Migration & Seed](#3-database-migration--seed)
  - [4. Running the Backend](#4-running-the-backend)
  - [5. Running the Frontend](#5-running-the-frontend)
- [Automated Tests & Concurrency Verification](#-automated-tests--concurrency-verification)
- [Application Navigation & Product Tour](#-application-navigation--product-tour)
- [Live Evaluation Script for Assessors](#-live-evaluation-script-for-assessors)
- [Known Limitations & Future Scaling](#-known-limitations--future-scaling)
- [Technical Documentation Index](#-technical-documentation-index)

---

## 💥 Problem Statement: Why Standard CRUD Fails

During high-severity incidents, multiple operators access, update, and resolve the same operational items simultaneously. Standard RESTful CRUD platforms fail under these conditions due to four critical anomalies:

1. **Lost Updates & Silent Overwrites**: Operator A updates a root-cause hypothesis while Operator B changes the priority. The last writer silently overwrites the first writer's data without warning.
2. **Double Assignment & Collision**: Two engineers press "Claim" on an unassigned Sev-1 outage at the exact same millisecond. Without atomic isolation, both believe they own the incident, splitting remediation efforts.
3. **Ghost State Jumps**: A front-line operator resolves an incident without required justification or skips supervisory review, breaking organizational compliance.
4. **Duplicate Operations from Retries**: Unreliable networks cause users to double-click buttons or trigger automated retry loops, spawning duplicate tickets or actions.

**Lockstep replaces generic CRUD endpoints with mathematically verified state machines, conditional atomic writes, optimistic concurrency control (OCC), and idempotency engines.**

---

## 🌟 5 Core Non-CRUD Operational Behaviors

| # | Operational Failure Mode | Engineering Solution | Technical Implementation / Protocol |
|---|-------------------------|----------------------|-------------------------------------|
| **1** | **Simultaneous Ownership Claims** | **Atomic SQL Conditional Writes** | `UPDATE work_items SET assignee_id = :actor_id, status = 'in_progress', version = version + 1 WHERE id = :id AND assignee_id IS NULL RETURNING id`. Executed with row-level transaction locks; the loser immediately receives `409 Conflict` identifying the winning operator. |
| **2** | **Stale View Overwrite Protection** | **Optimistic Concurrency Control (OCC)** | Strictly incrementing `version` integer enforced on every mutation. If client `version` does not match server `version`, the backend rejects with `409 Conflict` and returns the latest record for visual diff resolution. |
| **3** | **Duplicate Request & Double-Clicks** | **Idempotency Key Engine** | Client attaches `Idempotency-Key: <UUID>`. The backend verifies the key in an atomic database store before executing, caching HTTP status and payload. Replays return the cached response without re-triggering business logic. |
| **4** | **State Machine & RBAC Governance** | **Role-Gated Transition Matrix** | Strict validation of legal lifecycle paths and role authorizations (`member`, `lead`, `manager`). State transitions are gated: `pending_approval` requires `lead` or `manager`; rejections require reasons; resolutions require root-cause notes. |
| **5** | **Failure-Isolated Side Effects** | **Asynchronous Event Workers** | Core state mutations commit synchronously within ACID boundaries; notification delivery, SLA timers, and team telemetry run via non-blocking background workers with dead-letter isolation. |

---

## 🔄 State Machine & Role-Gated Transition Model

Every operational incident in Lockstep transitions through a deterministic, role-governed lifecycle:

```mermaid
stateDiagram-v2
    [*] --> OPEN: Incident Ingested (Any Role)
    
    OPEN --> IN_PROGRESS: Claim (Atomic Conditional Write)
    OPEN --> IN_PROGRESS: Assign (Lead / Manager)
    
    IN_PROGRESS --> PENDING_APPROVAL: Request Review (Member / Lead)
    IN_PROGRESS --> RESOLVED: Direct Resolve (Lead / Manager with Notes)
    
    PENDING_APPROVAL --> RESOLVED: Approve (Lead / Manager with Notes)
    PENDING_APPROVAL --> IN_PROGRESS: Reject (Lead / Manager with Reason)
    
    RESOLVED --> CLOSED: Close (Lead / Manager)
    CLOSED --> OPEN: Reopen (Manager Only)
```

### Transition Authority Matrix

| Transition | From State | To State | Minimum Required Role | Mandatory Payload |
|---|---|---|---|---|
| **Claim** | `OPEN` | `IN_PROGRESS` | `MEMBER` | None (Atomic `assignee_id IS NULL`) |
| **Investigate** | `OPEN` | `IN_PROGRESS` | `MEMBER` | `assignee_id` |
| **Request Approval**| `IN_PROGRESS` | `PENDING_APPROVAL` | `MEMBER` | None |
| **Approve** | `PENDING_APPROVAL` | `RESOLVED` | `LEAD` | Resolution Notes |
| **Reject** | `PENDING_APPROVAL` | `IN_PROGRESS` | `LEAD` | Rejection Reason |
| **Direct Resolve** | `IN_PROGRESS` | `RESOLVED` | `LEAD` | Resolution Notes |
| **Close** | `RESOLVED` | `CLOSED` | `LEAD` | None |
| **Reopen** | `CLOSED` | `OPEN` | `MANAGER` | Reopen Justification |

---

## 🏛️ System Architecture

### End-to-End System Diagram

<p align="center">
  <img src="asset/Architechture.png" alt="Lockstep End-to-End System Architecture" width="100%" />
</p>

### Repository File Structure

```text
Lockstep Operations Management Platform
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route controllers (auth, work_items, teams, audit)
│   │   ├── models/          # SQLAlchemy 2.0 async models (WorkItem, Profile, Team, AuditLog)
│   │   ├── schemas/         # Pydantic v2 validation and serialization schemas
│   │   ├── services/        # Workflow engine, Idempotency store, Background workers
│   │   ├── db/              # Async PostgreSQL engine & session dependency
│   │   └── config.py        # Centralized settings & environment configuration
│   └── tests/               # 22 async unit & integration tests (concurrency, OCC, RBAC, idempotency)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx   # Public landing page with live race condition simulator
│   │   │   ├── LoginPage.tsx     # Google OAuth & Demo Persona quick switcher
│   │   │   ├── TriagePage.tsx    # Live operational triage board & real-time CDC
│   │   │   ├── AnalyticsPage.tsx # MTTA/MTTR metrics, SLA velocity, & team capacity
│   │   │   ├── TeamsPage.tsx     # Team roster, RBAC authority matrix, & invite modal
│   │   │   ├── AuditPage.tsx     # Global immutable audit log explorer & JSON diff drawer
│   │   │   └── ProfilePage.tsx   # Operator identity, Sev-1 sirens, & session JWT inspection
│   │   ├── components/
│   │   │   ├── layout/AppNavbar.tsx  # Unified Mission Control header with route tabs & role switcher
│   │   │   ├── auth/ProtectedRoute.tsx # Session verification & loading screen
│   │   │   ├── triage/WorkItemList.tsx # Paginated work item grid with status pills
│   │   │   ├── detail/WorkItemDetailModal.tsx # Role-gated action buttons & audit timeline
│   │   │   ├── forms/WorkItemFormModal.tsx # Incident dispatch modal with idempotency keys
│   │   │   └── common/ConflictModal.tsx    # Side-by-side 409 conflict diff & reload UI
│   │   ├── contexts/AuthContext.tsx  # Dual-mode Supabase OAuth & Demo Persona session state
│   │   ├── api/             # Typed API client with auto JWT & demo persona header injection
│   │   └── lib/supabase.ts  # Supabase client & Realtime CDC WebSocket connection
├── supabase/
│   └── migrations/          # Schema (001), RLS Policies (002), Realistic Seed Data (003)
├── ENGINEERING_DECISIONS.md # Architectural decisions, alternatives evaluated, trade-offs accepted
└── CANDIDATE_WALKTHROUGH.md # Defense notes and evaluator presentation guide
```

---

## 🚀 Setup Instructions & Quickstart Guide

### 1. Prerequisites

Ensure your local machine has the following tools installed:
- **Python**: Version 3.10+ (tested on Python 3.12)
- **Node.js**: Version 18+ (tested on Node v20/v22/v24)
- **Supabase Account**: A free Supabase project with PostgreSQL and Realtime enabled.

---

### 2. Environment Configuration

#### Backend Environment
Create the `.env` file from the example template:
```bash
cp backend/.env.example backend/.env
```

Populate `backend/.env` with your project secrets:
```ini
# Supabase API Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Asynchronous PostgreSQL Connection String
DATABASE_URL=postgresql+asyncpg://postgres:your-db-password@db.your-project.supabase.co:5432/postgres

# Runtime Environment & Allowed CORS Origins
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
```

#### Frontend Environment
Create the `.env.local` file from the example template:
```bash
cp frontend/.env.example frontend/.env.local
```

Populate `frontend/.env.local`:
```ini
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 3. Database Migration & Seed

Run the migrations in sequential order using the **Supabase Dashboard SQL Editor**:

1. [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql): Creates tables (`profiles`, `teams`, `team_members`, `work_items`, `audit_logs`, `idempotency_records`) with composite B-tree indexes and JSONB metadata.
2. [`supabase/migrations/002_rls_policies.sql`](supabase/migrations/002_rls_policies.sql): Configures Row-Level Security (RLS) policies for tenant and team data isolation.
3. [`supabase/migrations/003_seed_data.sql`](supabase/migrations/003_seed_data.sql): Seeds realistic operational users across teams (`Alex Member`, `Sam Lead`, `Morgan Manager`) and active incidents.

---

### 4. Running the Backend

Open a terminal and execute:

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server with live reload
uvicorn app.main:app --reload --port 8000
```

- **Backend Base URL**: `http://localhost:8000`
- **Interactive OpenAPI (Swagger) Documentation**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/health`

---

### 5. Running the Frontend

Open a second terminal and execute:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- **Frontend Application URL**: `http://localhost:5173` (or `http://localhost:5174` if 5173 is in use)

---

## 🧪 Automated Tests & Concurrency Verification

Lockstep includes an automated asynchronous test suite built on `pytest` and `pytest-asyncio`. The suite rigorously validates high-concurrency race conditions, OCC version rejections, role boundaries, and idempotency guarantees.

### Running the Test Suite

```bash
cd backend
pytest -v
```

### Test Suite Execution Output (22 Passing in 0.19s)

```text
============================= test session starts ==============================
platform win32 -- Python 3.12.x, pytest-8.3.x, pluggy-1.5.x
rootdir: C:\Users\...\software_engineering_challenge\backend
plugins: anyio-4.8.x, asyncio-0.24.x
collected 22 items

tests/test_concurrency.py::test_atomic_claim_winner_and_loser PASSED      [  4%]
tests/test_concurrency.py::test_claim_already_assigned_item_fails PASSED   [  9%]
tests/test_idempotency.py::test_idempotency_service_store_and_check PASSED [ 13%]
tests/test_idempotency.py::test_duplicate_create_request_replays_cached_response PASSED [ 18%]
tests/test_optimistic_locking.py::test_update_success_increments_version PASSED [ 22%]
tests/test_optimistic_locking.py::test_update_stale_version_returns_409_conflict PASSED [ 27%]
tests/test_optimistic_locking.py::test_claim_stale_version_returns_409_conflict PASSED [ 31%]
tests/test_workflow_rbac.py::test_member_can_start_investigation PASSED   [ 36%]
tests/test_workflow_rbac.py::test_member_can_request_approval PASSED       [ 40%]
tests/test_workflow_rbac.py::test_member_cannot_approve PASSED             [ 45%]
tests/test_workflow_rbac.py::test_lead_can_approve PASSED                  [ 50%]
tests/test_workflow_rbac.py::test_manager_can_approve PASSED               [ 54%]
tests/test_workflow_rbac.py::test_rejection_requires_reason PASSED         [ 59%]
tests/test_workflow_rbac.py::test_rejection_with_reason_succeeds PASSED    [ 63%]
tests/test_workflow_rbac.py::test_resolution_requires_notes PASSED         [ 68%]
tests/test_workflow_rbac.py::test_resolution_with_notes_succeeds PASSED    [ 72%]
tests/test_workflow_rbac.py::test_member_cannot_close_resolved_item PASSED [ 77%]
tests/test_workflow_rbac.py::test_lead_can_close_resolved_item PASSED     [ 81%]
tests/test_workflow_rbac.py::test_only_manager_can_reopen_closed_item PASSED [ 86%]
tests/test_workflow_rbac.py::test_illegal_state_jump_rejected PASSED       [ 90%]
tests/test_workflow_rbac.py::test_pending_approval_ui_buttons PASSED       [ 95%]
tests/test_workflow_rbac.py::test_open_ui_buttons PASSED                   [100%]

======================== 22 passed, 2 warnings in 0.19s ========================
```

---

## 🧭 Application Navigation & Product Tour

The platform consists of seven fully integrated, responsive operational interfaces:

| Interface | Route | Primary Capabilities |
|---|---|---|
| **Public Landing Page** | `/` | Live interactive **Race Condition Simulator** demonstrating dual-operator claim collisions, 5 Non-CRUD pillar feature breakdowns, and real-time backend/database connectivity indicators. |
| **Authentication Portal** | `/login` | **Google OAuth 2.0 PKCE** login for production SSO + **1-Click Demo Persona Access** (`Alex Member`, `Sam Lead`, `Morgan Manager`) enabling immediate evaluator testing without external OAuth credentials. |
| **Operational Triage Board** | `/app/triage` | Paginated incident list with real-time status badges, severity tags, SLA countdown indicators, Supabase Realtime CDC active status, and detail drawer with role-governed transitions. |
| **Analytics & Telemetry** | `/app/analytics` | MTTA (Mean Time to Acknowledge) and MTTR (Mean Time to Resolve) compliance cards, 24h/7d/30d SLA throughput velocity chart, cross-team workload capacity distribution, and OCC engine metrics. |
| **Team Roster & Roles** | `/app/teams` | Team selector tabs (Engineering, Ops, Compliance, Support, Billing), live operator roster, interactive role promotion/demotion actions, and Role-Based Transition Authority reference matrix. |
| **Global Audit Explorer** | `/app/audit` | Comprehensive immutable audit event stream, filterable by mutation verb (`Created`, `Claimed`, `Status Changed`, `Approved`, `Rejected`), with side-by-side **Visual JSON Diff Drawer** and CSV/JSON export. |
| **Operator Profile** | `/app/profile` | Authenticated identity verification details, assigned operational teams, Sev-1 incident sound siren toggles, desktop push notification toggles, and live session JWT inspector with 1-click copy. |

---

## 🎯 Live Evaluation Script for Assessors

To experience Lockstep's deterministic concurrency controls in under 3 minutes:

1. **Verify Race Condition Defense**:
   - Navigate to `/` and scroll to the **Interactive Race Simulator**.
   - Click **"Simulate Parallel Claim Collision"**.
   - Observe how two asynchronous workers attempt to claim the exact same incident at the same timestamp. Exactly one worker wins via atomic SQL condition; the other receives `409 Conflict` with the winner's identity.

2. **Verify Stale Overwrite Protection (OCC 409)**:
   - Navigate to `/login` and select **"Log in as Alex Member"**.
   - Open `/app/triage` and click on an active incident to open the detail drawer.
   - Click **"Edit (OCC)"** to view the form.
   - In a second browser tab (or using the Swagger UI at `http://localhost:8000/docs`), submit a minor update to this item to increment its `version`.
   - Return to the first tab and click **"Save Changes"**.
   - **Result**: The **Optimistic Concurrency Conflict Modal** immediately triggers, displaying the local version vs. the server version with field-by-field diffs, preventing silent data loss.

3. **Verify Role-Gated Transition Governance**:
   - In the top navigation bar, use the **Operator Role Switcher** to toggle your identity between `MEMBER`, `LEAD`, and `MANAGER`.
   - As a `Member`, view an item in `pending_approval`. Notice that approval and rejection action buttons are strictly disabled and hidden.
   - Switch role to `Lead` or `Manager`. The approval and rejection actions appear. Click **Reject** and observe that a rejection reason is strictly required before submission.

4. **Verify Idempotency Protection**:
   - Open `/app/triage` and click **"Dispatch Incident"**.
   - Submit an incident. The frontend automatically attaches a unique `Idempotency-Key: <UUID>` header.
   - Any retry or rapid double-click returns the cached server response with identical headers and timestamps, preventing duplicate records.

---

## ⚠️ Known Limitations & Future Scaling

In alignment with transparent systems engineering, the following architectural trade-offs and future scaling pathways are documented:

| # | Current Architectural Constraint | Production Implication | Recommended Enterprise Scaling Solution |
|---|---|---|---|
| **1** | **Single-Region Database Affinity** | Supabase PostgreSQL resides in a single primary region (`gfirgasptccfbbgfaigs`). Cross-continental claims experience higher network round-trip latency. | Implement geo-partitioned tenant sharding or active-active distributed databases with Spanner / CockroachDB Raft consensus. |
| **2** | **PostgreSQL Idempotency Table** | Idempotency records are written to PostgreSQL (`idempotency_records`). Extremely high dispatch bursts (>20,000 req/s) add write IOPS to the primary database. | Offload the idempotency store to an in-memory Redis cluster utilizing atomic `SET NX EX` with automated TTL eviction. |
| **3** | **Coarse Row-Level OCC Gating** | OCC tracks version at the row level (`version` integer). If Operator A edits description while Operator B updates priority, a conflict is triggered. | Implement sub-field dirty-checking or operational 3-way merge algorithms to allow non-overlapping concurrent field updates. |
| **4** | **WebSocket Fan-Out Broadcast Limits** | Realtime updates rely on Supabase CDC streaming directly from PostgreSQL WAL logs. | Introduce an intermediate distributed message broker (Apache Kafka or Redis Pub/Sub) to decouple WebSocket connection count from database replication slots. |
| **5** | **Relational Search Indexing** | Search queries utilize parameterized SQL with PostgreSQL composite B-tree indexes and `ILIKE`. | As archives exceed millions of historical items, integrate a dedicated inverted-index search engine (Elasticsearch, OpenSearch, or pgvector for semantic search). |
| **6** | **Absence of Real-Time Presence Indicators** | Operators cannot see if another teammate is currently viewing or drafting notes on an item before clicking Save or Claim. | Integrate Supabase Realtime Presence channels to render live co-working avatars (e.g., *"Alex is viewing this item"*), visually preventing collision attempts before mutations are submitted. |

---

## 📚 Technical Documentation Index

Detailed architectural and procedural documents are available in this repository:

- [`ENGINEERING_DECISIONS.md`](ENGINEERING_DECISIONS.md): Comprehensive architectural decision log, evaluated alternatives, and rejected design patterns.
- [`CANDIDATE_WALKTHROUGH.md`](CANDIDATE_WALKTHROUGH.md): Step-by-step evaluator script, presentation notes, and architectural defense points.
- [`supabase/migrations/`](supabase/migrations/): Complete SQL migration scripts (`001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql`).
