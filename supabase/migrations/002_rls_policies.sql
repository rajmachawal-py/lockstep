-- ============================================================
-- Newtonite Operations Management System
-- Migration 002: Row-Level Security (RLS) Policies
-- ============================================================
-- Defense-in-depth: These policies enforce team-based access
-- at the database layer, complementing FastAPI's application-level checks.

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
-- Users can read all profiles (needed for assignee display, team views)
CREATE POLICY "profiles_select_all"
    ON public.profiles FOR SELECT
    USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================================
-- TEAMS POLICIES
-- ============================================================
-- Everyone can view teams
CREATE POLICY "teams_select_all"
    ON public.teams FOR SELECT
    USING (true);

-- ============================================================
-- TEAM MEMBERS POLICIES
-- ============================================================
-- Everyone can view team memberships (needed for UI role display)
CREATE POLICY "team_members_select_all"
    ON public.team_members FOR SELECT
    USING (true);

-- Only managers can add/remove team members
CREATE POLICY "team_members_manage"
    ON public.team_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
              AND tm.user_id = auth.uid()
              AND tm.role = 'manager'
        )
    );

-- ============================================================
-- WORK ITEMS POLICIES
-- ============================================================
-- Users can view work items that belong to their teams
CREATE POLICY "work_items_select_team"
    ON public.work_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = work_items.owning_team_id
              AND tm.user_id = auth.uid()
        )
    );

-- Users can create work items for teams they belong to
CREATE POLICY "work_items_insert_team"
    ON public.work_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = work_items.owning_team_id
              AND tm.user_id = auth.uid()
        )
    );

-- Users can update work items belonging to their teams
-- (Fine-grained role checks for specific transitions happen in FastAPI)
CREATE POLICY "work_items_update_team"
    ON public.work_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = work_items.owning_team_id
              AND tm.user_id = auth.uid()
        )
    );

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================
-- Users can view audit logs for work items in their teams
CREATE POLICY "audit_logs_select_team"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.work_items wi
            JOIN public.team_members tm ON tm.team_id = wi.owning_team_id
            WHERE wi.id = audit_logs.work_item_id
              AND tm.user_id = auth.uid()
        )
    );

-- Audit logs are insert-only (never updated or deleted)
CREATE POLICY "audit_logs_insert_authenticated"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() = actor_id);

-- ============================================================
-- IDEMPOTENCY RECORDS POLICIES
-- ============================================================
-- Users can only access their own idempotency records
CREATE POLICY "idempotency_own_records"
    ON public.idempotency_records FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================
-- SERVICE ROLE BYPASS
-- ============================================================
-- Note: The Supabase service_role key bypasses RLS by default.
-- Our FastAPI backend uses the service_role key to perform
-- administrative operations (e.g., atomic claims, cross-team queries)
-- while enforcing its own authorization logic in the application layer.
