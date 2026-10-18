import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  Edit3,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { WorkItemDetail, AuditLog, WorkItemStatus, ConflictErrorData } from '../../types';
import {
  fetchAuditLogs,
  claimWorkItem,
  transitionWorkItem,
  updateWorkItem,
} from '../../api/workItems';
import { AuditTimeline } from './AuditTimeline';
import { ApiError } from '../../api/client';

interface WorkItemDetailModalProps {
  item: WorkItemDetail | null;
  onClose: () => void;
  onRefreshItem: (id: string) => Promise<void>;
  onConflict: (data: ConflictErrorData) => void;
  currentUserRole: string;
}

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({
  item,
  onClose,
  onRefreshItem,
  onConflict,
  currentUserRole,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Note dialog prompts
  const [promptAction, setPromptAction] = useState<WorkItemStatus | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<any>('medium');

  useEffect(() => {
    if (item) {
      setEditTitle(item.title);
      setEditDescription(item.description || '');
      setEditPriority(item.priority);
      loadAudit();
    }
  }, [item?.id]);

  if (!item) return null;

  async function loadAudit() {
    if (!item) return;
    setLoadingAudit(true);
    try {
      const logs = await fetchAuditLogs(item.id);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }

  const handleClaim = async () => {
    if (!item) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await claimWorkItem(item.id, item.version, crypto.randomUUID());
      await onRefreshItem(item.id);
      await loadAudit();
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        onConflict(err.data);
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteTransition = async (targetStatus: WorkItemStatus) => {
    if (!item) return;

    if (targetStatus === 'resolved' || targetStatus === 'rejected') {
      setPromptAction(targetStatus);
      return;
    }

    await performTransition(targetStatus);
  };

  const performTransition = async (
    targetStatus: WorkItemStatus,
    resolutionNotes?: string,
    rejectionReason?: string
  ) => {
    if (!item) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await transitionWorkItem(
        item.id,
        {
          target_status: targetStatus,
          resolution_notes: resolutionNotes,
          rejection_reason: rejectionReason,
          version: item.version,
        },
        crypto.randomUUID()
      );
      setPromptAction(null);
      setActionNotes('');
      await onRefreshItem(item.id);
      await loadAudit();
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        onConflict(err.data);
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!item) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await updateWorkItem(item.id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        version: item.version,
      });
      setIsEditing(false);
      await onRefreshItem(item.id);
      await loadAudit();
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        onConflict(err.data);
      } else {
        setErrorMessage(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-overlay" id="work-item-detail-modal">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge badge-status-${item.status}`}>
              {item.status.replace('_', ' ')}
            </span>
            <span className="version-pill">v{item.version}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Team: {item.owning_team.name}
            </span>
          </div>

          <button className="btn btn-outline" style={{ padding: '4px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 24px',
            background: 'var(--bg-tertiary)',
          }}
        >
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'details' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === 'details' ? '2px solid var(--accent-blue)' : 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} /> Details & Controls
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: activeTab === 'audit' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === 'audit' ? '2px solid var(--accent-blue)' : 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={16} /> Audit Trail ({auditLogs.length})
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'details' ? (
            <div>
              {!isEditing ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{item.title}</h2>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 size={14} /> Edit (OCC)
                    </button>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', whiteSpace: 'pre-line' }}>
                    {item.description || 'No detailed description provided.'}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      background: 'var(--bg-tertiary)',
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '24px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</span>
                      <div className={`badge-priority badge-priority-${item.priority}`} style={{ marginTop: '4px' }}>
                        {item.priority}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assignee</span>
                      <div style={{ marginTop: '4px', fontWeight: 500 }}>
                        {item.assignee ? item.assignee.full_name : 'Unassigned'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Creator</span>
                      <div style={{ marginTop: '4px', fontWeight: 500 }}>
                        {item.creator.full_name}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes display if present */}
                  {item.resolution_notes && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '14px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                        Resolution Notes
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Prompt for rejection or resolution notes */}
                  {promptAction && (
                    <div
                      style={{
                        background: 'var(--bg-primary)',
                        padding: '16px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-strong)',
                        marginBottom: '20px',
                      }}
                    >
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                        {promptAction === 'resolved'
                          ? 'Please provide Resolution Notes:'
                          : 'Please specify the Rejection Reason:'}
                      </label>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder={
                          promptAction === 'resolved'
                            ? 'Root cause identified and patch deployed...'
                            : 'Fails security requirement...'
                        }
                        rows={3}
                        style={{
                          width: '100%',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          padding: '8px 12px',
                          outline: 'none',
                          marginBottom: '10px',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={() => setPromptAction(null)}>
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          disabled={!actionNotes.trim() || actionLoading}
                          onClick={() => {
                            if (promptAction === 'resolved') {
                              performTransition('resolved', actionNotes);
                            } else if (promptAction === 'rejected') {
                              performTransition('rejected', undefined, actionNotes);
                            }
                          }}
                        >
                          Confirm {promptAction}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Edit Form with OCC check */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Edit Item (Version {item.version})</h3>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        padding: '8px 12px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        padding: '8px 12px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Priority
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="custom-select"
                      style={{ width: '100%' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button className="btn btn-outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveEdit} disabled={actionLoading}>
                      Save Changes (OCC v{item.version})
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AuditTimeline logs={auditLogs} loading={loadingAudit} />
          )}
        </div>

        {/* Modal footer with action controls */}
        {!isEditing && activeTab === 'details' && (
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <div>
              {!item.assignee && (
                <button
                  className="btn btn-primary"
                  onClick={handleClaim}
                  disabled={actionLoading}
                >
                  <UserCheck size={16} /> Claim Ownership (Atomic)
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {item.allowed_transitions && item.allowed_transitions.length > 0 ? (
                item.allowed_transitions.map((target) => (
                  <button
                    key={target}
                    className={
                      target === 'approved' || target === 'resolved'
                        ? 'btn btn-success'
                        : target === 'rejected'
                        ? 'btn btn-danger'
                        : 'btn btn-secondary'
                    }
                    onClick={() => handleExecuteTransition(target)}
                    disabled={actionLoading}
                  >
                    {target === 'approved' && <CheckCircle size={15} />}
                    {target === 'rejected' && <XCircle size={15} />}
                    {target === 'in_investigation' && <Layers size={15} />}
                    Move to {target.replace('_', ' ')}
                  </button>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  No further transitions permitted for role "{currentUserRole}"
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
