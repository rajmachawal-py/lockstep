# Candidate Walkthrough & Defense Guide

> **Document Location:** `Docs/CANDIDATE_WALKTHROUGH.md`  
> **Audience:** Newtonite Senior Engineering Reviewers / Evaluators  
> **Topic:** Operational Web Application Architecture & Non-CRUD Failure Modes

---

## 1. Executive Summary

This project delivers an internal operational coordination web application built from the ground up for **high-pressure, concurrent operational triage**. Instead of building a generic CRUD ticket tracker, the system was intentionally engineered around the specific failure modes of operational systems:

1. **Race conditions** during emergency incident claiming.
2. **Silent overwrite data loss** from stale browser tabs (lost updates).
3. **Accidental duplicate mutations** caused by frantic double-clicking or network retries.
4. **Unauthorized state progression** (e.g., junior engineers bypassing compliance or management approval gates).
5. **Cascading failures** where third-party notifications or enrichment jobs break core transaction processing.

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

### Part A: Verification of the Automated Test Suite (30 seconds)
```bash
cd backend
.\.venv\Scripts\pytest -v
```
* **Show the Evaluator:** 22 passing tests in 0.12s.
* Highlight `test_concurrency.py`, `test_optimistic_locking.py`, `test_workflow_rbac.py`, and `test_idempotency.py`.

### Part B: Live Triage Board Walkthrough (2 minutes)
```bash
# Terminal 1: Backend
cd backend && .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```
1. Open `http://localhost:5173`.
2. Point out the **Realtime CDC Status Badge**: Connected to Supabase PostgreSQL change data capture.
3. Show the **Operational Triage Stats**: Dynamic counters for Open, In Investigation, Pending Approval, and Urgent Severity.
4. Show the **Persona Selector** in the top right:
   - Switch between **Alex Member**, **Sam Lead**, and **Morgan Manager**.
   - Show how the action buttons in the detail drawer adapt dynamically to reflect only permissions valid for that specific role.

### Part C: Demonstrating Non-CRUD Behaviors Live (3 minutes)

1. **Demonstrate Role Enforcement (State Machine)**:
   - As `Alex Member`, click on an item in `Pending Approval`. Notice that no "Approve" or "Reject" buttons appear.
   - Switch role to `Sam Lead` or `Morgan Manager`. Notice the "Approve" and "Reject" buttons appear.
   - Click "Reject". Notice that the system enforces entering a mandatory rejection reason before submitting.

2. **Demonstrate Optimistic Concurrency Control (OCC)**:
   - Open an item in the detail drawer.
   - Click "Edit (OCC)".
   - Change the title or priority.
   - Notice that if another user (or another tab) bumps the version, saving triggers the **Optimistic Concurrency Conflict Modal** showing the version diff and offering a non-destructive reload.

3. **Demonstrate Atomic Claim Ownership**:
   - Open an unclaimed item.
   - Click "Claim Ownership (Atomic)".
   - The item status atomically transitions to `in_investigation`, assigns the current operator, increments the version, and emits an immutable entry to the **Audit Timeline**.
