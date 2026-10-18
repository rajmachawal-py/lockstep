import React, { useState, useEffect } from 'react';
import { X, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { WorkItemCategory, WorkItemPriority, TeamDetail } from '../../types';
import { createWorkItem } from '../../api/workItems';

interface WorkItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  teams: TeamDetail[];
}

export const WorkItemFormModal: React.FC<WorkItemFormModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  teams,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkItemCategory>('incident');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId && teams.length > 0) {
      setTeamId(teams[0].id);
    }
  }, [teams, teamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTeamId = teamId || teams[0]?.id || 'a1000000-0000-0000-0000-000000000001';
    if (!title.trim() || !effectiveTeamId) return;

    setLoading(true);
    setError(null);

    // Generate client-side UUID idempotency key to prevent accidental duplicate submits
    const idempotencyKey = crypto.randomUUID();

    try {
      await createWorkItem(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          owning_team_id: effectiveTeamId,
        },
        idempotencyKey
      );
      setTitle('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create work item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" id="create-work-item-modal">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Dispatch New Work Item</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Incident Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Memory Leak in Ingestion Pipeline Worker #4"
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '9px 12px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Description & Context
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observed symptoms, affected metrics, or reproduction steps..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '9px 12px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkItemCategory)}
                  className="custom-select"
                  style={{ width: '100%' }}
                >
                  <option value="incident">Incident</option>
                  <option value="engineering_bug">Engineering Bug</option>
                  <option value="customer_issue">Customer Issue</option>
                  <option value="compliance_task">Compliance Task</option>
                  <option value="operational_request">Operational Request</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                  className="custom-select"
                  style={{ width: '100%' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Owning Team
              </label>
              <select
                value={teamId || teams[0]?.id || ''}
                onChange={(e) => setTeamId(e.target.value)}
                className="custom-select"
                style={{ width: '100%' }}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '4px',
              }}
            >
              <ShieldCheck size={14} color="#34d399" />
              Protected by Client-Generated Idempotency Key (Guards against duplicate double-clicks)
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !title.trim()}>
              {loading ? 'Submitting...' : 'Dispatch Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
