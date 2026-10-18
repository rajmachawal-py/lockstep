import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { ConflictErrorData } from '../../types';

interface ConflictModalProps {
  conflictData: ConflictErrorData | null;
  onClose: () => void;
  onReload: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflictData,
  onClose,
  onReload,
}) => {
  if (!conflictData) return null;

  const current = conflictData.current_data;

  return (
    <div className="modal-overlay" id="conflict-modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header" style={{ borderBottomColor: 'rgba(244, 63, 94, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f43f5e' }}>
            <AlertTriangle size={22} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Optimistic Concurrency Conflict (409)
            </h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="conflict-box">
            <p style={{ fontWeight: 600, color: '#fca5a5', marginBottom: '8px' }}>
              {conflictData.message}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Another team member submitted changes while you were editing this record.
              To prevent accidental data loss, your stale submission was rejected.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div className="version-pill" style={{ color: '#fca5a5' }}>
              Your Local Version: v{conflictData.your_version ?? '?'}
            </div>
            <div className="version-pill" style={{ color: '#34d399' }}>
              Server Current Version: v{conflictData.current_version ?? current?.version ?? '?'}
            </div>
          </div>

          {current && (
            <div className="diff-grid">
              <div className="diff-col">
                <div className="diff-header" style={{ color: '#38bdf8' }}>
                  Current Server State
                </div>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Title:</strong> {current.title}</div>
                  <div><strong>Status:</strong> {current.status}</div>
                  <div><strong>Priority:</strong> {current.priority}</div>
                  <div>
                    <strong>Assignee:</strong> {current.assignee ? current.assignee.full_name : 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="diff-col">
                <div className="diff-header" style={{ color: '#fbbf24' }}>
                  Recommended Action
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Reload the latest server record to review recent updates before reapplying your edits.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Dismiss
          </button>
          <button className="btn btn-primary" onClick={onReload}>
            <RefreshCw size={16} /> Reload Latest Version
          </button>
        </div>
      </div>
    </div>
  );
};
