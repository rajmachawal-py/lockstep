export type WorkItemCategory =
  | 'incident'
  | 'customer_issue'
  | 'engineering_bug'
  | 'compliance_task'
  | 'operational_request';

export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkItemStatus =
  | 'open'
  | 'in_investigation'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'resolved'
  | 'closed';

export type TeamRole = 'member' | 'lead' | 'manager';

export interface ProfileSummary {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface TeamSummary {
  id: string;
  name: string;
}

export interface WorkItemListItem {
  id: string;
  title: string;
  category: WorkItemCategory;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  owning_team: TeamSummary;
  assignee: ProfileSummary | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkItemDetail extends WorkItemListItem {
  description: string | null;
  creator: ProfileSummary;
  resolution_notes: string | null;
  allowed_transitions?: WorkItemStatus[];
}

export interface AuditLog {
  id: string;
  action: string;
  actor: ProfileSummary;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  extra_metadata?: Record<string, any> | null;
  created_at: string;
}

export interface ConflictErrorData {
  message: string;
  your_version?: number;
  current_version?: number;
  current_data?: WorkItemDetail;
}

export interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: TeamRole;
  joined_at: string;
}

export interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  members: TeamMember[];
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
