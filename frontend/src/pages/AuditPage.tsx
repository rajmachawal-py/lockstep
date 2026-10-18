import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  User,
  ArrowRight,
  X,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { AppNavbar } from '../components/layout/AppNavbar';
import { fetchGlobalAuditLogs, GlobalAuditLogItem } from '../api/audit';

export function AuditPage() {
  const [logs, setLogs] = useState<GlobalAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<GlobalAuditLogItem | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchGlobalAuditLogs({ action: selectedAction || undefined, search: search || undefined })
      .then((res) => {
        setLogs(res);
        setLoading(false);
      });
  }, [selectedAction, search]);

  // Export handlers
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lockstep_audit_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportNotice('Exported audit trail to JSON');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Action', 'Work Item ID', 'Work Item Title'];
    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      l.actor?.full_name || 'System',
      l.actor?.email || 'N/A',
      l.action,
      l.work_item_id,
      `"${(l.work_item_title || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `lockstep_audit_export_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportNotice('Exported audit trail to CSV');
    setTimeout(() => setExportNotice(null), 2500);
  };

  const getActionBadgeClass = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'badge-action-created';
      case 'claimed':
        return 'badge-action-claimed';
      case 'status_changed':
        return 'badge-action-status';
      case 'edited':
        return 'badge-action-edited';
      case 'approved':
        return 'badge-action-approved';
      case 'rejected':
        return 'badge-action-rejected';
      default:
        return 'badge-action-default';
    }
  };

  return (
    <div className="audit-page">
      <AppNavbar
        actionButton={
          <div className="export-action-group">
            <button
              className="btn btn-ghost btn-sm export-btn"
              onClick={handleExportCSV}
              title="Export filtered audit logs to CSV"
            >
              <FileSpreadsheet size={14} /> <span>Export CSV</span>
            </button>
            <button
              className="btn btn-ghost btn-sm export-btn"
              onClick={handleExportJSON}
              title="Export filtered audit logs to JSON"
            >
              <FileJson size={14} /> <span>Export JSON</span>
            </button>
          </div>
        }
      />

      <main className="app-container audit-container">
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">
              Global Immutable Audit Log Explorer
            </h1>
            <p className="page-subtitle">
              Forensic inspection and compliance verification for every atomic claim, state mutation, and OCC reconciliation.
            </p>
          </div>

          <div className="audit-integrity-badge">
            <ShieldCheck size={16} />
            <span>Cryptographically Bound &bull; Append-Only</span>
          </div>
        </div>

        {exportNotice && (
          <div className="export-toast-notice">
            <CheckCircle2 size={16} />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="audit-filter-bar">
          <div className="audit-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Work Item ID, title, or actor name..."
              className="audit-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search-btn" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="audit-action-filter">
            <Filter size={14} className="filter-icon" />
            <select
              className="audit-filter-select"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">All Mutation Verbs</option>
              <option value="created">Created (Item Ingestion)</option>
              <option value="claimed">Claimed (Atomic Lock)</option>
              <option value="status_changed">Status Changed (State Transition)</option>
              <option value="edited">Edited (OCC Mutation)</option>
              <option value="approved">Approved (Lead Gate)</option>
              <option value="rejected">Rejected (Manager Gate)</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="audit-table-card">
          <div className="audit-card-header">
            <div className="card-header-left">
              <ScrollText size={16} />
              <h3 className="card-header-title">System Event Stream</h3>
            </div>
            <span className="audit-total-badge">{logs.length} Recorded Mutations</span>
          </div>

          {loading ? (
            <div className="table-loading-state">
              <span>Streaming immutable event records...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="audit-empty-state">
              <ScrollText size={32} />
              <p>No audit log events match the current filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Actor</th>
                    <th>Action Verb</th>
                    <th>Target Work Item</th>
                    <th>Diff Snapshot</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`audit-row ${selectedLog?.id === log.id ? 'audit-row-selected' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="timestamp-cell">
                        <div className="timestamp-group">
                          <Clock size={12} className="time-icon" />
                          <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                          <span className="timestamp-date">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td>
                        <div className="actor-cell">
                          <div className="actor-avatar">
                            {log.actor?.full_name ? log.actor.full_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="actor-text">
                            <span className="actor-name">{log.actor?.full_name || 'System Engine'}</span>
                            <span className="actor-email">{log.actor?.email || 'daemon@lockstep.io'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td>
                        <span className={`badge-action ${getActionBadgeClass(log.action)}`}>
                          {log.action.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      {/* Target Work Item */}
                      <td className="target-cell">
                        <span className="target-title">
                          {log.work_item_title || `Item ${log.work_item_id.substring(0, 8)}`}
                        </span>
                        <span className="target-id">{log.work_item_id}</span>
                      </td>

                      {/* Diff Trigger */}
                      <td>
                        <button
                          className="btn btn-ghost btn-xs btn-inspect-diff"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          <Code2 size={12} /> View Diff
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Slide-Over Drawer for Metadata & JSON Diff */}
      {selectedLog && (
        <div className="diff-drawer-overlay" onClick={() => setSelectedLog(null)}>
          <div className="diff-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="diff-drawer-header">
              <div className="diff-header-title">
                <Code2 size={18} />
                <h3>Audit Event #{selectedLog.id}</h3>
              </div>
              <button className="diff-close-btn" onClick={() => setSelectedLog(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="diff-drawer-body">
              {/* Event Metadata Card */}
              <div className="diff-meta-box">
                <div className="diff-meta-item">
                  <span className="meta-label">Action</span>
                  <span className={`badge-action ${getActionBadgeClass(selectedLog.action)}`}>
                    {selectedLog.action.toUpperCase()}
                  </span>
                </div>
                <div className="diff-meta-item">
                  <span className="meta-label">Actor</span>
                  <span className="meta-val">{selectedLog.actor?.full_name} ({selectedLog.actor?.email})</span>
                </div>
                <div className="diff-meta-item">
                  <span className="meta-label">Work Item</span>
                  <span className="meta-val">{selectedLog.work_item_title || selectedLog.work_item_id}</span>
                </div>
                <div className="diff-meta-item">
                  <span className="meta-label">Timestamp</span>
                  <span className="meta-val">{new Date(selectedLog.created_at).toUTCString()}</span>
                </div>
              </div>

              {/* Side-by-Side Diff View */}
              <div className="diff-panels-grid">
                {/* Old Values */}
                <div className="diff-box">
                  <div className="diff-box-header diff-header-old">
                    <span>Previous State (old_values)</span>
                  </div>
                  <pre className="diff-code diff-code-old">
                    <code>
                      {selectedLog.old_values
                        ? JSON.stringify(selectedLog.old_values, null, 2)
                        : '// No prior state (Item Creation Event)'}
                    </code>
                  </pre>
                </div>

                {/* New Values */}
                <div className="diff-box">
                  <div className="diff-box-header diff-header-new">
                    <span>Mutated State (new_values)</span>
                  </div>
                  <pre className="diff-code diff-code-new">
                    <code>
                      {selectedLog.new_values
                        ? JSON.stringify(selectedLog.new_values, null, 2)
                        : '// Deleted or Terminal State'}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Context / Metadata */}
              {selectedLog.metadata && (
                <div className="diff-metadata-section">
                  <span className="meta-section-title">Forensic Context &amp; Idempotency Metadata</span>
                  <pre className="diff-code diff-code-meta">
                    <code>{JSON.stringify(selectedLog.metadata, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditPage;
