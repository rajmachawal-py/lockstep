-- ============================================================
-- Newtonite Operations Management System
-- Migration 003: Seed Data
-- ============================================================
-- Creates test users, teams, memberships, and sample work items.
--
-- NOTE: Users must be created through Supabase Auth first.
-- This script assumes users already exist in auth.users and
-- their profiles have been auto-created by the handle_new_user trigger.
-- 
-- After creating users via Supabase Auth (dashboard or API), run
-- the team/membership/work-item inserts below.
-- ============================================================

-- ============================================================
-- TEAMS
-- ============================================================
INSERT INTO public.teams (id, name, description) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Engineering', 'Software engineering and infrastructure team'),
    ('a1000000-0000-0000-0000-000000000002', 'Operations', 'Day-to-day operational coordination and incident management'),
    ('a1000000-0000-0000-0000-000000000003', 'Compliance', 'Regulatory compliance, audits, and policy enforcement'),
    ('a1000000-0000-0000-0000-000000000004', 'Customer Support', 'Customer-facing issue resolution and escalation'),
    ('a1000000-0000-0000-0000-000000000005', 'Billing', 'Billing operations, invoicing, and payment disputes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED USERS (Create via Supabase Auth API/Dashboard)
-- ============================================================
-- Use the following emails with password "Test@12345" in Supabase Auth:
--
-- 1. alice@newtonite.com   -> Engineering Manager
-- 2. bob@newtonite.com     -> Engineering Lead
-- 3. charlie@newtonite.com -> Engineering Member / Ops Member
-- 4. diana@newtonite.com   -> Operations Manager
-- 5. eve@newtonite.com     -> Compliance Lead
-- 6. frank@newtonite.com   -> Customer Support Member
--
-- After creating users, note their UUIDs from auth.users table
-- and update the team_members inserts below accordingly.

-- ============================================================
-- TEAM MEMBERSHIPS (Update UUIDs after creating auth users)
-- ============================================================
-- Template (uncomment and fill in real UUIDs after user creation):
--
-- INSERT INTO public.team_members (team_id, user_id, role) VALUES
--     -- Alice: Engineering Manager
--     ('a1000000-0000-0000-0000-000000000001', '<alice-uuid>', 'manager'),
--     -- Bob: Engineering Lead
--     ('a1000000-0000-0000-0000-000000000001', '<bob-uuid>', 'lead'),
--     -- Charlie: Engineering Member + Ops Member
--     ('a1000000-0000-0000-0000-000000000001', '<charlie-uuid>', 'member'),
--     ('a1000000-0000-0000-0000-000000000002', '<charlie-uuid>', 'member'),
--     -- Diana: Operations Manager
--     ('a1000000-0000-0000-0000-000000000002', '<diana-uuid>', 'manager'),
--     -- Eve: Compliance Lead
--     ('a1000000-0000-0000-0000-000000000003', '<eve-uuid>', 'lead'),
--     -- Frank: Customer Support Member
--     ('a1000000-0000-0000-0000-000000000004', '<frank-uuid>', 'member')
-- ON CONFLICT (team_id, user_id) DO NOTHING;

-- ============================================================
-- SAMPLE WORK ITEMS (Update created_by UUIDs after user creation)
-- ============================================================
-- Template (uncomment and fill in real UUIDs):
--
-- INSERT INTO public.work_items (title, description, category, priority, status, owning_team_id, created_by) VALUES
--     ('Production database connection pool exhausted',
--      'Connection pool hitting 100% utilization during peak hours. Users experiencing timeouts on dashboard queries.',
--      'incident', 'urgent', 'open',
--      'a1000000-0000-0000-0000-000000000001', '<alice-uuid>'),
--
--     ('Customer unable to access billing portal',
--      'Enterprise customer Acme Corp reports 403 errors when attempting to view invoices. Affects 50+ seat account.',
--      'customer_issue', 'high', 'open',
--      'a1000000-0000-0000-0000-000000000004', '<frank-uuid>'),
--
--     ('Q4 SOC2 compliance audit preparation',
--      'Prepare access control documentation and evidence collection for upcoming SOC2 Type II audit.',
--      'compliance_task', 'high', 'open',
--      'a1000000-0000-0000-0000-000000000003', '<eve-uuid>'),
--
--     ('Upgrade authentication service to v3.2',
--      'New version includes critical security patches. Requires coordinated deployment across 3 services.',
--      'engineering_bug', 'medium', 'open',
--      'a1000000-0000-0000-0000-000000000001', '<bob-uuid>'),
--
--     ('Office network switch replacement',
--      'Floor 3 network switch showing intermittent failures. IT has replacement hardware ready.',
--      'operational_request', 'low', 'open',
--      'a1000000-0000-0000-0000-000000000002', '<diana-uuid>')
-- ON CONFLICT DO NOTHING;
