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

export function TriagePage() {
  const navigate = useNavigate();
  const { profile, updateRole, signOut } = useAuth();

  const [items, setItems] = useState<WorkItemListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState<TeamDetail[]>([]);

  // Modals & Selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<WorkItemDetail | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictErrorData | null>(null);

  const [livePulse, setLivePulse] = useState(false);

  // Current effective role from AuthContext
  const currentRole: TeamRole = profile?.role || 'member';

  // Fetch Teams
  useEffect(() => {
    fetchTeams()
      .then((t) => setTeams(t))
      .catch(() => {
        // Fallback default team if backend DB not yet seeded
        setTeams([
          {
            id: 'd9b9a674-1e24-4f93-bb5b-5e60803c14d1',
            name: 'Core Platform Engineering',
            description: 'Core infrastructure',
            members: [],
            created_at: new Date().toISOString(),
          },
        ]);
      });
  }, []);

  // Fetch Items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorkItems({
        page,
        pageSize: 20,
        search: search || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        teamId: selectedTeam || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      // Mock Fallback Items if backend offline
      setItems([
        {
          id: 'mock-1',
          title: 'Database connection pool exhausted during payment burst',
          category: 'incident',
          priority: 'urgent',
          status: 'open',
          owning_team: { id: 'team-eng', name: 'Core Platform Engineering' },
          assignee: null,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'mock-2',
          title: 'Compliance audit: Customer data retention check',
          category: 'compliance_task',
          priority: 'high',
          status: 'in_investigation',
          owning_team: { id: 'team-ops', name: 'Site Reliability' },
          assignee: {
            id: 'lead-1',
            full_name: 'Sam Lead',
            email: 'lead@newtonite.io',
            avatar_url: null,
          },
          version: 2,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'mock-3',
          title: 'Refund approval requested for Enterprise account',
          category: 'operational_request',
          priority: 'medium',
          status: 'pending_approval',
          owning_team: { id: 'team-ops', name: 'Billing Ops' },
          assignee: {
            id: 'member-1',
            full_name: 'Alex Member',
            email: 'member@newtonite.io',
            avatar_url: null,
          },
          version: 3,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setTotal(3);
      setTotalPages(1);
    } finally {
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

  const handleSelectItem = async (id: string) => {
    setSelectedItemId(id);
    try {
      const detail = await fetchWorkItem(id);
      setSelectedItemDetail(detail);
    } catch {
      // Mock detail fallback for demo mode
      const item = items.find((i) => i.id === id);
      if (item) {
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
          allowed_transitions:
            item.status === 'open'
              ? ['in_investigation']
              : item.status === 'in_investigation'
              ? ['pending_approval', 'resolved']
              : item.status === 'pending_approval' && (currentRole === 'lead' || currentRole === 'manager')
              ? ['approved', 'rejected']
              : [],
        });
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRoleChange = (newRole: TeamRole) => {
    updateRole(newRole);
    if (selectedItemId) {
      handleSelectItem(selectedItemId);
    }
    loadItems();
  };

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
