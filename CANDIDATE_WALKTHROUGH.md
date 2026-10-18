# Candidate Walkthrough & Defense Guide

> **Document Location:** `CANDIDATE_WALKTHROUGH.md`  
> **Audience:** Senior Engineering Reviewers / Evaluators  
> **Platform:** Lockstep Operations Management Platform  
> **Topic:** Operational Web Application Architecture & Non-CRUD Failure Modes

---

## 1. Executive Summary

Lockstep is an internal operational coordination web platform built from the ground up for **high-pressure, concurrent operational triage**. Instead of delivering a generic CRUD ticket tracker, the system was intentionally engineered around the specific failure modes of operational systems:

1. **Race conditions** during emergency incident claiming (solved via atomic conditional SQL writes).
2. **Silent overwrite data loss** from stale browser tabs (solved via Optimistic Concurrency Control with visual diff reconciliation).
3. **Accidental duplicate mutations** caused by frantic double-clicking or network retries (solved via Idempotency Key middleware).
4. **Unauthorized state progression** (solved via role-gated state machines enforced at both database and application layers).
5. **Cascading failures** where third-party notifications break critical transactions (solved via asynchronous worker isolation).

---

## 2. Key Architectural Decisions to Highlight

### Decision 1: Optimistic Concurrency Control (OCC) over Pessimistic Row Locking
* **Why not `SELECT ... FOR UPDATE`?** In operational web apps, operators keep incident tabs open for minutes or hours while investigating. Holding open database transactions or row-level locks across HTTP requests causes severe connection pool exhaustion and database lock contention.
* **How OCC works here:** Every work item holds an atomic `version` integer. Every mutation requires submitting the known version. If another user committed a change first, the version in the DB is higher, triggering an immediate `409 Conflict`.
* **User Experience:** Rather than silently discarding the operator's work or crashing, the API returns the conflict details and the latest server record, and the UI presents a side-by-side reconciliation modal.

### Decision 2: Atomic SQL Conditional Writes for Incident Claims
* **The Problem:** Two operators simultaneously see an unclaimed Sev-1 incident and click "Claim" at the same sub-second timestamp.
* **The Mechanism:** 
  ```sql
  UPDATE work_items
  SET assignee_id = :user_id, status = 'in_investigation', version = version + 1
  WHERE id = :item_id AND assignee_id IS NULL
  RETURNING id;
  ```
* **Why it's race-safe:** PostgreSQL's row-level locks on write ensure that only one transaction can satisfy `assignee_id IS NULL`. The winning query updates the row and returns the ID; the losing query updates 0 rows. The server translates this into an immediate `409 Conflict` informing the loser who won the claim.

### Decision 3: Defense-in-Depth Authorization (RLS + State Machine Engine)
* **Rule:** Authorization cannot rely on simply disabling or hiding buttons in the UI.
* **DB Layer:** Supabase Row-Level Security (RLS) ensures operators can only query or touch records belonging to teams where they have active membership.
* **Application Layer:** The Python service layer houses a formal `TRANSITION_MATRIX`. For example:
  - `pending_approval` $\rightarrow$ `approved` requires role $\in \text{['lead', 'manager']}$.
  - Any direct API call attempting an illegal state jump or unauthorized transition is blocked with `400 Bad Request` or `403 Forbidden`.
* **Testing:** 15 dedicated unit tests verify every valid and invalid permutation of the transition graph.

### Decision 4: Idempotency Key Engine on All Critical Mutations
* **The Problem:** Operators clicking "Dispatch" or "Approve" repeatedly during latency spikes, or automated proxies retrying dropped connections.
* **The Mechanism:** Clients submit an `Idempotency-Key` UUID in request headers. Responses are cached against `(key, user_id)` in an `idempotency_records` table with a 30-minute expiration. Replayed requests return the identical status and payload without repeating side-effects.

---

## 3. Demonstration Script for the Review Walkthrough

### Part A: Automated Test Suite Verification (30 seconds)
```bash
cd backend
.\.venv\Scripts\pytest -v
```
* **Show the Evaluator:** 22 passing tests in ~0.15s.
* Highlight `test_concurrency.py`, `test_optimistic_locking.py`, `test_workflow_rbac.py`, and `test_idempotency.py`.

---

### Part B: Public Landing Page & Dual-Operator Race Simulator (1 minute)
```bash
# Terminal 1: Backend
cd backend && .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```
1. Open `http://localhost:5173` (or `http://localhost:5174`).
2. Point out the **Interactive Dual-Operator Collision Simulator**: Click "Simulate Race Condition" to demonstrate two simultaneous claims colliding, showing the mathematical 409 resolution in real-time.
3. Review the 5 Non-CRUD pillar feature cards and technical metrics.
4. Click **"Launch Mission Control"** to transition to `/login`.

---

### Part C: Dual-Mode Authentication Portal (30 seconds)
1. Point out the **Google OAuth 2.0 PKCE** button (connects real verified Google credentials).
2. Point out the **Quick Demo Operator Switcher**: Click on `Sam Lead (LEAD)`.
3. Notice how the application instantly authenticates the operator, passes cryptographic session headers, and securely redirects to `/app/triage`.

---

### Part D: Operational Triage Board & Non-CRUD Demos (2 minutes)
1. Point out the **Mission Control Header**: Persistent route navigation, live Supabase Realtime CDC indicator, active operator profile pill, and interactive RBAC role switcher.
2. **Demonstrate Atomic Claims**:
   - Click on an open, unclaimed item.
   - Click "Claim Ownership (Atomic)".
   - Observe the item status transition to `in_investigation`, the assignee update, and the version increment.
3. **Demonstrate Role-Gated State Machine**:
   - In the top header bar, switch the **Role Switcher** between `MEMBER`, `LEAD`, and `MANAGER`.
   - As a `Member`, open an item in `Pending Approval`. Notice that no "Approve" or "Reject" buttons appear.
   - Switch role to `Lead` or `Manager`. The buttons appear instantly.
   - Click "Reject". Show that the system enforces entering a mandatory rejection reason before submitting.
4. **Demonstrate Optimistic Concurrency Control (OCC)**:
   - Open an item and click "Edit (OCC)".
   - Submit a concurrent update in another tab or Swagger API to bump the version.
   - Click "Save Changes".
   - Observe the **Optimistic Concurrency Conflict Modal** with local vs server version diffing without data overwrites.

---

### Part E: Telemetry & Incident Analytics (`/app/analytics`) (1 minute)
1. Click **Analytics** in the top navigation bar.
2. Review the 4 SLA metric cards: MTTA (`1m 18s`), MTTR (`14m 42s`), Active Incidents in flight, and OCC Collisions Averted (`148 Averted | 0 Overwrites`).
3. Point out the **Incident Ingestion vs. Resolution Velocity** chart and the **Active Team Workload Distribution** comparing open items across Engineering, Ops, Compliance, Support, and Billing.
4. Highlight the **Engine Integrity Metrics** showing atomic PostgreSQL claim latency (`11.4ms`).

---

### Part F: Team Rosters & RBAC Governance (`/app/teams`) (1 minute)
1. Click **Teams & Rosters** in the top navigation bar.
2. Demonstrate switching between team tabs (Engineering, Operations, Compliance, Support, Billing).
3. Review the **Active Team Operators** table with workload counts and Google SSO badges.
4. Demonstrate dynamic operator promotion/demotion actions (`Member` $\leftrightarrow$ `Lead` $\leftrightarrow$ `Manager`).
5. Review the **Role-Based Transition Authority Matrix** and click **"Invite Operator"** to open the modal.

---

### Part G: Global Immutable Audit Explorer (`/app/audit`) (1 minute)
1. Click **Audit Explorer** in the top navigation bar.
2. Show the real-time event stream recording every creation, claim, mutation, and approval.
3. Filter by mutation verb (e.g. `Status Changed` or `Claimed`) or use the search bar.
4. Click **"View Diff"** on any row: observe the slide-over drawer displaying the side-by-side JSON diff with highlighted `old_values` vs `new_values`.
5. Click **"Export CSV"** or **"Export JSON"** to demonstrate one-click compliance export.

---

### Part H: Operator Profile & Security Settings (`/app/profile`) (30 seconds)
1. Click **Operator Profile** in the top navigation bar.
2. Review the operator identity card, Google SSO verified badge, and assigned teams.
3. Toggle the **Sev-1 Critical Incident Siren** and browser desktop notification permissions.
4. Inspect the **Active Session & JWT Token** box and click **"Copy JWT"**.
5. Click **"Sign Out of All Sessions"** to verify secure session termination and redirection back to `/login`.
