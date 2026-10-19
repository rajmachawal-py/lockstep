import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  Radio,
  User,
  Users,
  CheckCircle2,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import {
  WorkItemListItem,
  WorkItemDetail,
  WorkItemStatus,
  ConflictErrorData,
  TeamDetail,
  TeamRole,
} from '../types';
import {
  fetchWorkItems,
  fetchWorkItem,
  fetchTeams,
} from '../api/workItems';
import { WorkItemList } from '../components/triage/WorkItemList';
import { WorkItemDetailModal } from '../components/detail/WorkItemDetailModal';
import { ConflictModal } from '../components/common/ConflictModal';
import { WorkItemFormModal } from '../components/forms/WorkItemFormModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppNavbar } from '../components/layout/AppNavbar';

const INITIAL_BACKLOG_ITEMS: WorkItemListItem[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    title: 'Production database connection pool exhausted',
    category: 'incident',
    priority: 'urgent',
    status: 'open',
    owning_team: { id: 'a1000000-0000-0000-0000-000000000001', name: 'Engineering' },
    assignee: null,
    version: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    title: 'Customer unable to access billing portal',
    category: 'customer_issue',
    priority: 'high',
    status: 'in_investigation',
    owning_team: { id: 'a1000000-0000-0000-0000-000000000004', name: 'Customer Support' },
    assignee: {
      id: 'u2',
      full_name: 'Frank Support',
      email: 'frank@newtonite.com',
      avatar_url: null,
    },
    version: 2,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    title: 'Q4 SOC2 compliance audit preparation',
    category: 'compliance_task',
    priority: 'high',
    status: 'pending_approval',
    owning_team: { id: 'a1000000-0000-0000-0000-000000000003', name: 'Compliance' },
    assignee: {
      id: 'u3',
      full_name: 'Eve Compliance',
      email: 'eve@newtonite.com',
      avatar_url: null,
    },
    version: 3,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
    title: 'Upgrade authentication service to v3.2',
    category: 'engineering_bug',
    priority: 'medium',
    status: 'approved',
    owning_team: { id: 'a1000000-0000-0000-0000-000000000001', name: 'Engineering' },
    assignee: {
      id: 'u4',
      full_name: 'Bob Lead',
      email: 'bob@newtonite.com',
      avatar_url: null,
    },
    version: 4,
    created_at: new Date(Date.now() - 28800000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
    title: 'Office network switch replacement',
    category: 'operational_request',
    priority: 'low',
    status: 'resolved',
    owning_team: { id: 'a1000000-0000-0000-0000-000000000002', name: 'Operations' },
    assignee: {
      id: 'u5',
      full_name: 'Diana Ops',
      email: 'diana@newtonite.com',
      avatar_url: null,
    },
    version: 5,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_TEAMS: TeamDetail[] = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: 'Engineering', description: 'Software engineering and infrastructure', members: [], created_at: new Date().toISOString() },
  { id: 'a1000000-0000-0000-0000-000000000002', name: 'Operations', description: 'Day-to-day operational coordination and incident management', members: [], created_at: new Date().toISOString() },
  { id: 'a1000000-0000-0000-0000-000000000003', name: 'Compliance', description: 'Regulatory compliance and audit verification', members: [], created_at: new Date().toISOString() },
  { id: 'a1000000-0000-0000-0000-000000000004', name: 'Customer Support', description: 'Customer escalations and support triage', members: [], created_at: new Date().toISOString() },
  { id: 'a1000000-0000-0000-0000-000000000005', name: 'Billing', description: 'Billing operations and invoices', members: [], created_at: new Date().toISOString() },
];

function getInitialCachedItems(): WorkItemListItem[] {
  try {
    const cached = localStorage.getItem('lockstep_triage_cache_v2');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_BACKLOG_ITEMS;
}

export function TriagePage() {
  const navigate = useNavigate();
  const { profile, updateRole, signOut } = useAuth();

  const [items, setItems] = useState<WorkItemListItem[]>(() => getInitialCachedItems());
  const [total, setTotal] = useState(() => getInitialCachedItems().length);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState<TeamDetail[]>(INITIAL_TEAMS);

  // Modals & Selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<WorkItemDetail | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictErrorData | null>(null);

  const [livePulse, setLivePulse] = useState(false);

  // Current effective role from AuthContext
  const currentRole: TeamRole = profile?.role || 'member';

  // Fetch Teams in background
  useEffect(() => {
    fetchTeams()
      .then((t) => {
        if (t && t.length > 0) setTeams(t);
      })
      .catch(() => {});
  }, []);

  // Fetch Items with Stale-While-Revalidate and Local Filtering Fallback
  const loadItems = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetchWorkItems({
        page,
        pageSize: 20,
        search: search || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        teamId: selectedTeam || undefined,
      });

      if (res && res.items && (res.items.length > 0 || (search || selectedStatus || selectedPriority || selectedTeam))) {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        if (res.items.length > 0 && !search && !selectedStatus && !selectedPriority && !selectedTeam) {
          try {
            localStorage.setItem('lockstep_triage_cache_v2', JSON.stringify(res.items));
          } catch {}
        }
      } else {
        // Backend returned empty array for user without teams; fallback to instant demo dataset
        let fallback = INITIAL_BACKLOG_ITEMS;
        if (selectedStatus) fallback = fallback.filter((i) => i.status === selectedStatus);
        if (selectedPriority) fallback = fallback.filter((i) => i.priority === selectedPriority);
        if (selectedTeam) fallback = fallback.filter((i) => i.owning_team.id === selectedTeam);
        if (search) fallback = fallback.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
        setItems(fallback);
        setTotal(fallback.length);
        setTotalPages(1);
      }
    } catch {
      // Offline / Timeout (Cold Start) fallback - filter cached items client-side
      let fallback = INITIAL_BACKLOG_ITEMS;
      try {
        const cached = localStorage.getItem('lockstep_triage_cache_v2');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) fallback = parsed;
        }
      } catch {}

      if (selectedStatus) fallback = fallback.filter((i) => i.status === selectedStatus);
      if (selectedPriority) fallback = fallback.filter((i) => i.priority === selectedPriority);
      if (selectedTeam) fallback = fallback.filter((i) => i.owning_team.id === selectedTeam);
      if (search) fallback = fallback.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));

      setItems(fallback);
      setTotal(fallback.length);
      setTotalPages(1);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, [page, search, selectedStatus, selectedPriority, selectedTeam]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Supabase Realtime CDC Subscription
  useEffect(() => {
    const channel = supabase
      .channel('work_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_items' },
        (payload) => {
          setLivePulse(true);
          setTimeout(() => setLivePulse(false), 800);

          if (payload.eventType === 'INSERT') {
            loadItems();
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as WorkItemListItem;
            setItems((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
            );
            if (selectedItemId === updated.id) {
              setSelectedItemDetail((prev) => (prev ? { ...prev, ...updated } : null));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((item) => item.id !== oldId));
            if (selectedItemId === oldId) {
              setSelectedItemId(null);
              setSelectedItemDetail(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedItemId, loadItems]);

  const handleSelectItem = useCallback(async (id: string) => {
    setSelectedItemId(id);
    try {
      const detail = await fetchWorkItem(id);
      setSelectedItemDetail(detail);
    } catch {
      // Mock detail fallback for demo mode
      const item = items.find((i) => i.id === id);
      if (item) {
        let allowed: WorkItemStatus[] = [];
        if (item.status === 'open') {
          allowed = ['in_investigation'];
        } else if (item.status === 'in_investigation') {
          allowed = currentRole === 'lead' || currentRole === 'manager'
            ? ['pending_approval', 'resolved']
            : ['pending_approval'];
        } else if (item.status === 'pending_approval') {
          allowed = currentRole === 'lead' || currentRole === 'manager'
            ? ['approved', 'rejected']
            : [];
        } else if (item.status === 'approved') {
          allowed = ['resolved'];
        } else if (item.status === 'rejected') {
          allowed = ['in_investigation'];
        } else if (item.status === 'resolved') {
          allowed = currentRole === 'lead' || currentRole === 'manager'
            ? ['closed']
            : [];
        } else if (item.status === 'closed') {
          allowed = currentRole === 'manager' ? ['open'] : [];
        }

        setSelectedItemDetail({
          ...item,
          description:
            'Observed abnormal memory growth and latency spikes during high-throughput operational hours.',
          creator: {
            id: 'admin-1',
            full_name: 'Operations Dispatcher',
            email: 'ops@newtonite.io',
            avatar_url: null,
          },
          resolution_notes: null,
          allowed_transitions: allowed,
        });
      }
    }
  }, [items, currentRole]);

  // Re-fetch item detail whenever role changes so buttons immediately update
  useEffect(() => {
    if (selectedItemId) {
      handleSelectItem(selectedItemId);
    }
  }, [currentRole, selectedItemId, handleSelectItem]);

  return (
    <div>
      <AppNavbar
        actionButton={
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} /> Dispatch Item
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="app-container">
        <WorkItemList
          items={items}
          total={total}
          page={page}
          pageSize={20}
          totalPages={totalPages}
          loading={loading}
          isSyncing={isSyncing}
          search={search}
          selectedStatus={selectedStatus}
          selectedPriority={selectedPriority}
          selectedTeam={selectedTeam}
          teams={teams}
          onSearchChange={setSearch}
          onStatusChange={setSelectedStatus}
          onPriorityChange={setSelectedPriority}
          onTeamChange={setSelectedTeam}
          onPageChange={setPage}
          onSelectItem={handleSelectItem}
        />
      </main>

      {/* Modals */}
      <WorkItemDetailModal
        item={selectedItemDetail}
        onClose={() => {
          setSelectedItemId(null);
          setSelectedItemDetail(null);
        }}
        onRefreshItem={handleSelectItem}
        onConflict={(conflict) => setConflictData(conflict)}
        currentUserRole={currentRole}
      />

      <ConflictModal
        conflictData={conflictData}
        onClose={() => setConflictData(null)}
        onReload={() => {
          setConflictData(null);
          if (selectedItemId) {
            handleSelectItem(selectedItemId);
          }
          loadItems();
        }}
      />

      <WorkItemFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => loadItems()}
        teams={teams}
      />
    </div>
  );
}

export default TriagePage;
