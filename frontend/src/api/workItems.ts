import { apiFetch } from './client';
import {
  WorkItemListItem,
  WorkItemDetail,
  AuditLog,
  PaginatedResponse,
  WorkItemCategory,
  WorkItemPriority,
  WorkItemStatus,
  TeamDetail,
} from '../types';

export interface WorkItemFilterParams {
  page?: number;
  pageSize?: number;
  teamId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

export async function fetchWorkItems(
  params: WorkItemFilterParams = {}
): Promise<PaginatedResponse<WorkItemListItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('page_size', params.pageSize.toString());
  if (params.teamId) query.set('team_id', params.teamId);
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.assigneeId) query.set('assignee_id', params.assigneeId);
  if (params.search) query.set('search', params.search);

  const qs = query.toString();
  return apiFetch<PaginatedResponse<WorkItemListItem>>(
    `/work-items${qs ? `?${qs}` : ''}`
  );
}

export async function fetchWorkItem(id: string): Promise<WorkItemDetail> {
  return apiFetch<WorkItemDetail>(`/work-items/${id}`);
}

export async function createWorkItem(
  payload: {
    title: string;
    description?: string;
    category: WorkItemCategory;
    priority: WorkItemPriority;
    owning_team_id: string;
  },
  idempotencyKey?: string
): Promise<WorkItemDetail> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return apiFetch<WorkItemDetail>('/work-items', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });
}

export async function updateWorkItem(
  id: string,
  payload: {
    title?: string;
    description?: string;
    category?: WorkItemCategory;
    priority?: WorkItemPriority;
    version: number;
  }
): Promise<WorkItemDetail> {
  return apiFetch<WorkItemDetail>(`/work-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function claimWorkItem(
  id: string,
  version: number,
  idempotencyKey?: string
): Promise<WorkItemDetail> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return apiFetch<WorkItemDetail>(`/work-items/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify({ version }),
    headers,
  });
}

export async function transitionWorkItem(
  id: string,
  payload: {
    target_status: WorkItemStatus;
    resolution_notes?: string;
    rejection_reason?: string;
    version: number;
  },
  idempotencyKey?: string
): Promise<WorkItemDetail> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  return apiFetch<WorkItemDetail>(`/work-items/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });
}

export async function fetchAuditLogs(itemId: string): Promise<AuditLog[]> {
  return apiFetch<AuditLog[]>(`/work-items/${itemId}/audit`);
}

export async function fetchTeams(): Promise<TeamDetail[]> {
  return apiFetch<TeamDetail[]>('/teams');
}
