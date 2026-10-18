import React from 'react';
import { History, User, CheckCircle2, XCircle, ArrowRight, Shield } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditTimelineProps {
  logs: AuditLog[];
  loading: boolean;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs, loading }) => {
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading immutable audit trail...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No audit logs recorded for this item.
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <History size={14} color="#38bdf8" />;
      case 'claimed':
        return <User size={14} color="#fbbf24" />;
      case 'approved':
        return <CheckCircle2 size={14} color="#34d399" />;
      case 'rejected':
        return <XCircle size={14} color="#f43f5e" />;
      case 'status_changed':
        return <ArrowRight size={14} color="#a855f7" />;
      default:
        return <Shield size={14} color="#94a3b8" />;
    }
  };

  return (
    <div className="audit-timeline">
      {logs.map((log) => (
        <div className="audit-item" key={log.id}>
          <div className="audit-dot">{getActionIcon(log.action)}</div>
          <div className="audit-content">
            <div className="audit-meta">
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {log.actor.full_name} ({log.action.replace('_', ' ')})
              </span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {new Date(log.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            {log.old_values && log.new_values && (
              <div
                style={{
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginTop: '4px',
                }}
              >
                {Object.keys(log.new_values).map((key) => (
                  <div key={key}>
                    <span style={{ color: 'var(--text-muted)' }}>{key}:</span>{' '}
                    <span style={{ color: '#fca5a5' }}>
                      {String(log.old_values?.[key] ?? 'none')}
                    </span>{' '}
                    &rarr;{' '}
                    <span style={{ color: '#86efac' }}>
                      {String(log.new_values?.[key])}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {log.extra_metadata && (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {log.extra_metadata.rejection_reason && (
                  <div>Rejection reason: "{log.extra_metadata.rejection_reason}"</div>
                )}
                {log.extra_metadata.resolution_notes && (
                  <div>Resolution notes: "{log.extra_metadata.resolution_notes}"</div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
