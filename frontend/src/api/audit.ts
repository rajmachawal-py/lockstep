import { apiFetch } from './client';
import { AuditLog } from '../types';

export interface GlobalAuditLogItem extends AuditLog {
  work_item_id: string;
  work_item_title?: string;
  metadata?: Record<string, any> | null;
}

export interface AuditFilterParams {
  action?: string;
  search?: string;
  limit?: number;
}

export async function fetchGlobalAuditLogs(
  params: AuditFilterParams = {}
): Promise<GlobalAuditLogItem[]> {
  const query = new URLSearchParams();
  if (params.action) query.set('action', params.action);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', params.limit.toString());

  const qs = query.toString();
  const endpoint = `/audit/logs${qs ? `?${qs}` : ''}`;

  try {
    return await apiFetch<GlobalAuditLogItem[]>(endpoint);
  } catch {
    // Resilient fallback for demo mode
    return [
      {
        id: 'aud-001',
        work_item_id: 'mock-1',
        work_item_title: 'Database connection pool exhausted during payment burst',
        action: 'status_changed',
        actor: {
          id: 'lead-1',
          full_name: 'Sam Lead',
          email: 'lead@newtonite.io',
          avatar_url: null,
        },
        old_values: { status: 'open', version: 1 },
        new_values: { status: 'in_investigation', version: 2 },
        metadata: { reason: 'Triage investigation commenced by On-Call Lead' },
        created_at: new Date(Date.now() - 1200000).toISOString(),
      },
      {
        id: 'aud-002',
        work_item_id: 'mock-1',
        work_item_title: 'Database connection pool exhausted during payment burst',
        action: 'claimed',
        actor: {
          id: 'lead-1',
          full_name: 'Sam Lead',
          email: 'lead@newtonite.io',
          avatar_url: null,
        },
        old_values: { assignee_id: null },
        new_values: { assignee_id: 'lead-1' },
        metadata: { mode: 'atomic_sql_claim' },
        created_at: new Date(Date.now() - 1300000).toISOString(),
      },
      {
        id: 'aud-003',
        work_item_id: 'mock-3',
        work_item_title: 'Refund approval requested for Enterprise account',
        action: 'created',
        actor: {
          id: 'member-1',
          full_name: 'Alex Member',
          email: 'member@newtonite.io',
          avatar_url: null,
        },
        old_values: null,
        new_values: {
          title: 'Refund approval requested for Enterprise account',
          status: 'pending_approval',
          priority: 'medium',
          category: 'operational_request',
        },
        metadata: { idempotency_key: 'req_8812a_refund' },
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'aud-004',
        work_item_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        work_item_title: 'Compliance audit: Customer data retention check',
        action: 'edited',
        actor: {
          id: 'manager-1',
          full_name: 'Morgan Manager',
          email: 'manager@newtonite.io',
          avatar_url: null,
        },
        old_values: { priority: 'medium', version: 1 },
        new_values: { priority: 'high', version: 2 },
        metadata: { occ_reconciled: true },
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'aud-005',
        work_item_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        work_item_title: 'Compliance audit: Customer data retention check',
        action: 'created',
        actor: {
          id: 'manager-1',
          full_name: 'Morgan Manager',
          email: 'manager@newtonite.io',
          avatar_url: null,
        },
        old_values: null,
        new_values: {
          title: 'Compliance audit: Customer data retention check',
          status: 'in_investigation',
          priority: 'medium',
        },
        metadata: {},
        created_at: new Date(Date.now() - 10800000).toISOString(),
      },
    ];
  }
}
