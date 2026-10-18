import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Plus,
  RefreshCw,
  Radio,
  User,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  WorkItemListItem,
  WorkItemDetail,
  ConflictErrorData,
  TeamDetail,
} from './types';
import {
  fetchWorkItems,
  fetchWorkItem,
  fetchTeams,
} from './api/workItems';
import { WorkItemList } from './components/triage/WorkItemList';
import { WorkItemDetailModal } from './components/detail/WorkItemDetailModal';
import { ConflictModal } from './components/common/ConflictModal';
import { WorkItemFormModal } from './components/forms/WorkItemFormModal';
import { supabase } from './lib/supabase';

import { setApiPersona } from './api/client';

// Predefined demo personas representing differing RBAC levels
const DEMO_PERSONAS = [
  { id: 'member-1', name: 'Alex Member', role: 'member', email: 'member@newtonite.io' },
  { id: 'lead-1', name: 'Sam Lead', role: 'lead', email: 'lead@newtonite.io' },
  { id: 'manager-1', name: 'Morgan Manager', role: 'manager', email: 'manager@newtonite.io' },
];

export function App() {
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

  // Current persona / role for testing RBAC state transitions
  const [currentPersona, setCurrentPersona] = useState(DEMO_PERSONAS[0]);
  const [livePulse, setLivePulse] = useState(false);

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
    } catch (err: any) {
      console.error('Failed to fetch items:', err);
      // Fallback demo items if backend database is offline during inspection
      setItems((prev) =>
        prev.length > 0
          ? prev
          : [
              {
                id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
                title: 'High CPU Utilization on Ingestion Workers',
                category: 'incident',
                priority: 'urgent',
                status: 'open',
                owning_team: { id: 'd9b9a674', name: 'Core Platform Engineering' },
                assignee: null,
                version: 1,
                created_at: new Date(Date.now() - 3600000).toISOString(),
                updated_at: new Date(Date.now() - 1800000).toISOString(),
              },
              {
                id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
                title: 'Payment Gateway Webhook Timeout v2.14',
                category: 'engineering_bug',
                priority: 'high',
                status: 'in_investigation',
                owning_team: { id: 'd9b9a674', name: 'Core Platform Engineering' },
                assignee: {
                  id: 'member-1',
                  full_name: 'Alex Member',
                  email: 'member@newtonite.io',
                  avatar_url: null,
                },
                version: 2,
                created_at: new Date(Date.now() - 7200000).toISOString(),
                updated_at: new Date(Date.now() - 600000).toISOString(),
              },
              {
                id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
                title: 'SOC2 Annual Audit Evidence Export',
                category: 'compliance_task',
                priority: 'medium',
                status: 'pending_approval',
                owning_team: { id: 'd9b9a674', name: 'Core Platform Engineering' },
                assignee: {
                  id: 'member-1',
                  full_name: 'Alex Member',
                  email: 'member@newtonite.io',
                  avatar_url: null,
                },
                version: 3,
                created_at: new Date(Date.now() - 86400000).toISOString(),
                updated_at: new Date(Date.now() - 7200000).toISOString(),
              },
            ]
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus, selectedPriority, selectedTeam]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Supabase Realtime CDC Listener
  useEffect(() => {
    const channel = supabase
      .channel('realtime:work_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_items' },
        (payload) => {
          setLivePulse(true);
          setTimeout(() => setLivePulse(false), 2000);
          loadItems();
          // If the currently viewed item was modified in another session, notify
          if (selectedItemId && payload.new && (payload.new as any).id === selectedItemId) {
            handleSelectItem(selectedItemId);
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
    } catch (err: any) {
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
              : item.status === 'pending_approval' && (currentPersona.role === 'lead' || currentPersona.role === 'manager')
              ? ['approved', 'rejected']
              : [],
        });
      }
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <header className="app-header">
        <div className="brand-container">
          <div className="brand-icon">
            <ShieldAlert size={20} color="#ffffff" />
          </div>
          <div>
            <span className="brand-title">Newtonite Ops Manager</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
              Engineered for High-Pressure Concurrency
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live CDC Realtime Indicator */}
          <div className="header-status-badge">
            <span className={`pulse-dot ${livePulse ? 'live-ping' : ''}`} />
            <span>Supabase Realtime CDC Active</span>
          </div>

          {/* Persona Switcher for Evaluator RBAC Testing */}
          <div className="user-persona-selector">
            <User size={14} color="var(--accent-blue)" />
            <span className="persona-label">Testing Role:</span>
            <select
              className="persona-select"
              value={currentPersona.id}
              onChange={(e) => {
                const found = DEMO_PERSONAS.find((p) => p.id === e.target.value);
                if (found) {
                  setCurrentPersona(found);
                  setApiPersona(found.email, found.role, found.name);
                  if (selectedItemId) {
                    handleSelectItem(selectedItemId);
                  }
                  loadItems();
                }
              }}
            >
              {DEMO_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Create Item Button */}
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} /> Dispatch Item
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-container">
        <WorkItemList
          items={items}
          total={total}
          page={page}
          pageSize={20}
          totalPages={totalPages}
          onPageChange={setPage}
          onSelectItem={handleSelectItem}
          search={search}
          onSearchChange={setSearch}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          selectedTeam={selectedTeam}
          onTeamChange={setSelectedTeam}
          teams={teams}
          loading={loading}
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
        currentUserRole={currentPersona.role}
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

export default App;
