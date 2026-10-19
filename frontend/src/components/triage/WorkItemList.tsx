import React from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { WorkItemListItem, TeamDetail } from '../../types';

interface WorkItemListProps {
  items: WorkItemListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectItem: (id: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  selectedPriority: string;
  onPriorityChange: (val: string) => void;
  selectedTeam: string;
  onTeamChange: (val: string) => void;
  teams: TeamDetail[];
  loading: boolean;
  isSyncing?: boolean;
}

export const WorkItemList: React.FC<WorkItemListProps> = ({
  items,
  total,
  page,
  totalPages,
  onPageChange,
  onSelectItem,
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  selectedTeam,
  onTeamChange,
  teams,
  loading,
  isSyncing = false,
}) => {
  // Compute triage statistics
  const openCount = items.filter((i) => i.status === 'open').length;
  const investigatingCount = items.filter((i) => i.status === 'in_investigation').length;
  const pendingCount = items.filter((i) => i.status === 'pending_approval').length;
  const urgentCount = items.filter((i) => i.priority === 'urgent').length;

  return (
    <div>
      {/* Triage Stats Counter Banner */}
      <div className="stats-banner">
        <div className="stat-card">
          <div className="stat-card-title">
            <span>Open Backlog</span>
            <Layers size={16} color="var(--status-open)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--status-open)' }}>
            {openCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>In Investigation</span>
            <Clock size={16} color="var(--status-investigating)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--status-investigating)' }}>
            {investigatingCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Pending Approval</span>
            <AlertTriangle size={16} color="var(--status-pending)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--status-pending)' }}>
            {pendingCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">
            <span>Urgent Severity</span>
            <ShieldAlert size={16} color="var(--priority-urgent)" />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--priority-urgent)' }}>
            {urgentCount}
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="filter-action-bar">
        <div className="filters-group">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon-pos" />
            <input
              type="text"
              placeholder="Search active work items..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <select
            className="custom-select"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_investigation">In Investigation</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            className="custom-select"
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {teams.length > 0 && (
            <select
              className="custom-select"
              value={selectedTeam}
              onChange={(e) => onTeamChange(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isSyncing && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#60a5fa', fontWeight: 500 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
              Live sync...
            </span>
          )}
          <span>Showing {items.length} of {total} incidents</span>
        </div>
      </div>

      {/* Work Items Table */}
      <div className="table-container">
        {loading && items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Fetching operational backlog...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No work items match current filter criteria.
          </div>
        ) : (
          <table className="ops-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Work Item Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Team</th>
                <th>Assignee</th>
                <th>OCC Version</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => onSelectItem(item.id)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Category: {item.category.replace('_', ' ')}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-status-${item.status}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-priority badge-priority-${item.priority}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>{item.owning_team.name}</span>
                  </td>
                  <td>
                    {item.assignee ? (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {item.assignee.full_name}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#fbbf24',
                          background: 'rgba(251, 191, 36, 0.1)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        Unclaimed
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="version-pill">v{item.version}</span>
                  </td>
                  <td style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                    {new Date(item.updated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 21, 34, 0.5)',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 8px' }}
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '4px 8px' }}
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
