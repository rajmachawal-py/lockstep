# Engineering Decisions & Architectural Trade-offs

> **Project:** Lockstep Operations Management Platform  
> **Candidate Assessment Document:** This living document records key architectural decisions, alternatives evaluated, trade-offs accepted, and intentional omissions made during the development of this platform.

---

## 1. Concurrency Control: Optimistic Locking (OCC) vs. Pessimistic Locking

### Context & Problem
In high-pressure operations, multiple operators frequently view or attempt to edit the same work item (e.g., investigating a production incident or reassigning a compliance request). Using unconstrained CRUD operations leads to the "lost update" problem, where the last writer silently overwrites intermediate edits.

### Decision
We implemented a two-pronged concurrency strategy:
1. **Optimistic Concurrency Control (OCC) for Record Edits**:
   * Each work item carries a strictly incrementing `version` integer.
   * Updates require providing the last known `version` (via request payload or `If-Match` header).
   * If `record.version != payload.version`, the write is rejected with an HTTP `409 Conflict`, returning the current state of the record.
2. **Atomic Conditional Updates for Ownership Claiming**:
   * To prevent two users from claiming an unassigned item simultaneously, the claim operation executes an atomic SQL conditional write:
     ```sql
     UPDATE work_items 
     SET assignee_id = :user_id, status = 'in_investigation', version = version + 1
     WHERE id = :item_id AND assignee_id IS NULL
     RETURNING *;
     ```
   * Only the transaction that touches the row first succeeds; the competing request receives 0 affected rows and is returned a `409 Conflict`.

### Trade-offs & Alternatives Considered
* **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**: Would lock records for the duration of a user's read/edit session. However, this causes severe lock contention in web applications if users leave edit tabs open, degrading throughput.
* **Event Sourcing / CRDTs**: Highly resilient for collaborative rich text, but excessive complexity for discrete operational fields (status, priority, assignee) within a rapid timeframe.
* **Why OCC Wins**: OCC maximizes read throughput, eliminates distributed lock timeouts, and guarantees zero silent data loss.

---

## 2. Dual-Layer Authorization: Supabase RLS + Backend State-Machine Enforcement

### Context & Problem
The brief explicitly emphasizes that *"Authorization must be enforced by the system itself and should not rely only on hiding controls in the user interface."* Furthermore, operations require role-based gates (e.g., only Team Leads or Managers can approve compliance or financial items).

### Decision
We adopted a **defense-in-depth authorization model**:
1. **Database Layer (Supabase PostgreSQL RLS)**:
   * Policies enforce tenant/team isolation. Users can only select or mutate items that belong to teams they are registered members of.
2. **Application Layer (FastAPI Service Layer)**:
   * The backend validates role-specific workflow actions (e.g., moving an item to `approved` requires role $\ge$ `lead` on `owning_team_id`).
   * Decoupling business workflow logic from database stored procedures keeps transition rules readable, testable in unit tests, and easily maintainable.

### Trade-offs & Alternatives Considered
* **Pure Client-Side / UI-Level Gating**: Rejected immediately. Trivial to bypass via direct API calls.
* **Pure Database Triggers/Stored Procedures**: Harder to unit-test in Python, obfuscates application logic, and makes detailed client error messages difficult to format.
* **Dual-Layer Advantage**: Protects against accidental data leakage at the DB layer while maintaining expressive, rich business validation in Python.

---

## 3. Synchronous Core Transitions vs. Asynchronous Side-Effects

### Context & Problem
Operational actions have primary effects (changing item status, reassigning) and secondary side-effects (emitting audit logs, notifying team members, triggering escalation webhooks). If secondary effects fail or lag (e.g., external webhook timeout), they should not abort or slow down the critical state update.

### Decision
* **Synchronous (Transactional)**:
  * State transitions, ownership assignment, and database version increments are strictly synchronous inside an ACID transaction.
  * The primary audit event record is written synchronously within the same transaction to guarantee non-repudiation ("important actions must not silently disappear").
* **Asynchronous (Background Tasks)**:
  * Notification dispatch, metrics aggregation, and external event webhooks are dispatched via asynchronous workers (`FastAPI BackgroundTasks` / async workers).
  * Failures in background tasks are caught, recorded in a dead-letter log table, and retried without impacting the user response time.

### Trade-offs & Alternatives Considered
* **Fully Synchronous Everything**: Simplest to implement, but external network delays (Slack, email, webhooks) inflate API latency and cause partial failure inconsistencies.
* **Fully Asynchronous (CQRS/Event-Driven)**: Eventual consistency introduces cognitive lag for operators who need instant confirmation of claims and transitions.
* **Hybrid Win**: Instant, consistent operational state for users + non-blocking resilience for secondary side-effects.

---

## 4. Scalable Data Retrieval: Server-Side Pagination, Filtering & Lean Payloads

### Context & Problem
The system expects thousands of users and tens of thousands of active work items with growing history. Loading the entire dataset into browser memory is unacceptable and will freeze client browsers.

### Decision
* **Server-Side Filtering & Pagination**:
  * Work item lists are served via indexed, parameterized queries supporting `limit`, `offset` (or cursor-based pagination), filtered by `team_id`, `status`, `priority`, and `assignee_id`.
* **Lean Payloads vs. On-Demand Enrichment**:
  * The list endpoint returns summary representations of work items.
  * Heavy details (complete audit history timeline, full comment threads, metadata diffs) are fetched on-demand when a specific work item is opened.
* **Database Indexing**:
  * Composite indexes are created on `(owning_team_id, status)`, `(assignee_id, status)`, and `(created_at DESC)` to ensure $O(\log N)$ query times even with $>100,000$ records.

### Trade-offs & Alternatives Considered
* **Client-Side Array Filtering**: Works well for $<500$ items, but completely violates the prompt's scale requirements for enterprise operational tools.
* **Cursor-Based vs. Offset Pagination**: Offset pagination was selected for the triage board to support intuitive page-number jumping and count totals, with query limits capped at 50 items per page to prevent deep-offset performance penalties.

---

## 5. Duplicate Protection: Idempotency Keys on Critical Mutations

### Context & Problem
Under pressure or with spotty network connections, users frequently click buttons repeatedly or browsers retry timed-out POST requests. In an operational tool, duplicate requests can trigger multiple approvals, double transitions, or duplicate records.

### Decision
* We implemented an `Idempotency-Key` mechanism on critical endpoints (`POST /api/v1/work-items`, `POST /api/v1/work-items/{id}/transition`).
* When a request arrives with an `Idempotency-Key`:
  1. The server checks the `idempotency_records` table.
  2. If the key exists and the previous request succeeded, the cached HTTP response code and payload are returned immediately.
  3. If the key is currently being processed by another concurrent request, the incoming request receives a `409 Conflict` or waits briefly.
  4. If new, the transaction executes and caches the response atomically.

### Trade-offs & Alternatives Considered
* **Frontend Debounce / Disabling Buttons**: Necessary for good UX, but completely insufficient for real reliability (network retries, script calls, browser refreshes bypass UI buttons).
* **Idempotency Key Win**: Rock-solid guarantee of single-execution semantics regardless of network instability or frantic multi-clicking.

---

## 6. Authentication Architecture: Google OAuth 2.0 PKCE + Demo Persona Dual Mode

### Context & Problem
Enterprise operational tools require cryptographic user identities, yet technical evaluators need to test role-gated state machines without having to configure external Google Cloud OAuth credentials before their first run.

### Decision
We implemented a **Dual-Mode Authentication Architecture**:
1. **Google OAuth 2.0 PKCE Flow**:
   - The frontend uses Supabase Auth's Proof Key for Code Exchange (PKCE) flow via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
   - On successful authentication, Google returns an authorization code exchanged for a JWT.
   - The PostgreSQL trigger `public.handle_new_user()` automatically extracts user metadata (`full_name`, `avatar_url`, `email`) into `public.profiles`.
2. **Demo Persona Fast-Path**:
   - Technical evaluators can click any pre-configured operator persona (`Alex Member`, `Sam Lead`, `Morgan Manager`) on `/login`.
   - The system injects simulated identity headers (`X-User-Email`, `X-User-Role`, `X-User-Name`) which the backend FastAPI dependency accepts in development mode.
   - This ensures **100% testability on any local machine with zero external setup**.

---

## 7. Extended Mission Control Suite & Forensic Audit Differencing

### Context & Problem
High-velocity incident management requires continuous visibility across SLAs, team capacities, and forensic audit histories. Confining the UI to a single triage list forces context switching and hides critical systemic bottlenecks.

### Decision
We expanded the application into a cohesive **Mission Control Suite**:
1. **Unified Application Shell (`AppNavbar`)**: Provides instantaneous route switching across `/app/triage`, `/app/analytics`, `/app/teams`, `/app/audit`, and `/app/profile`.
2. **Forensic Audit Diff Storage (`old_values` vs `new_values`)**:
   - The `audit_logs` table stores both before and after JSON snapshots for every mutation.
   - In `/app/audit`, clicking any event opens a slide-over panel displaying the exact side-by-side JSON diff with red/green change highlighting.
3. **Telemetry & Real-Time Analytics (`/app/analytics`)**:
   - Computes MTTA and MTTR SLA trends, active incident severity distribution, and a real-time counter of averted OCC collisions.
   - Displays capacity loads across teams to prevent operator burnout.

---

## 8. Intentional Omissions & Future Enhancements

The following architectural decisions remain intentionally deferred for production scaling:
1. **Full-Text Search Engine (e.g., Elasticsearch)**: PostgreSQL's native `tsvector` / `ILIKE` indexing was chosen instead of introducing external cluster dependencies.
2. **Complex BPMN Dynamic Workflow Builder**: Hardcoded, well-typed state machine transitions were prioritized over a visual flowchart editor to ensure bulletproof correctness and zero regression risks.
3. **Multi-Region Active-Active Replication**: Supabase single-region PostgreSQL was chosen; multi-region active-active would require conflict-free replicated data types (CRDTs) or distributed consensus.
