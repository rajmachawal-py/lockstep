-- ============================================================
-- Newtonite Operations Management System
-- Migration 001: Initial Schema
-- ============================================================
-- Run this in Supabase SQL Editor (or via supabase db push)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. TEAM MEMBERS (User <-> Team with Role)
-- ============================================================
CREATE TYPE public.team_role AS ENUM ('member', 'lead', 'manager');

CREATE TABLE IF NOT EXISTS public.team_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role        public.team_role NOT NULL DEFAULT 'member',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(team_id, user_id)
);

-- ============================================================
-- 4. WORK ITEMS (Core operational entity)
-- ============================================================
CREATE TYPE public.work_item_category AS ENUM (
    'incident',
    'customer_issue',
    'engineering_bug',
    'compliance_task',
    'operational_request'
);

CREATE TYPE public.work_item_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

CREATE TYPE public.work_item_status AS ENUM (
    'open',
    'in_investigation',
    'pending_approval',
    'approved',
    'rejected',
    'resolved',
    'closed'
);

CREATE TABLE IF NOT EXISTS public.work_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category        public.work_item_category NOT NULL DEFAULT 'operational_request',
    priority        public.work_item_priority NOT NULL DEFAULT 'medium',
    status          public.work_item_status NOT NULL DEFAULT 'open',
    owning_team_id  UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
    assignee_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    resolution_notes TEXT,
    version         INTEGER NOT NULL DEFAULT 1,  -- Optimistic Concurrency Control
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. AUDIT LOGS (Immutable event history)
-- ============================================================
CREATE TYPE public.audit_action AS ENUM (
    'created',
    'claimed',
    'unassigned',
    'status_changed',
    'edited',
    'approved',
    'rejected',
    'resolved',
    'closed',
    'comment_added'
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_item_id    UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
    actor_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action          public.audit_action NOT NULL,
    old_values      JSONB,     -- Snapshot of changed fields before
    new_values      JSONB,     -- Snapshot of changed fields after
    metadata        JSONB,     -- Extra context (e.g., rejection reason)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. IDEMPOTENCY RECORDS (Duplicate request prevention)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idempotency_records (
    key             VARCHAR(255) NOT NULL,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    response_code   INTEGER NOT NULL,
    response_body   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (key, user_id)
);

-- ============================================================
-- INDEXES for performant pagination, filtering, and lookups
-- ============================================================

-- Work items: Common filter/sort patterns
CREATE INDEX idx_work_items_team_status ON public.work_items(owning_team_id, status);
CREATE INDEX idx_work_items_assignee ON public.work_items(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_work_items_status ON public.work_items(status);
CREATE INDEX idx_work_items_priority ON public.work_items(priority);
CREATE INDEX idx_work_items_created_at ON public.work_items(created_at DESC);
CREATE INDEX idx_work_items_category ON public.work_items(category);

-- Audit logs: Timeline lookups per work item
CREATE INDEX idx_audit_logs_work_item ON public.audit_logs(work_item_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);

-- Team members: Quick membership checks
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);

-- Idempotency: TTL-based cleanup
CREATE INDEX idx_idempotency_created ON public.idempotency_records(created_at);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_work_items_updated_at
    BEFORE UPDATE ON public.work_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
