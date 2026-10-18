import { apiFetch } from './client';
import { TeamDetail, TeamRole } from '../types';

export interface TeamMemberItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: TeamRole;
  joined_at: string;
  avatar_url?: string | null;
  workload_count?: number;
}

export interface TeamDetailExtended extends TeamDetail {
  members: TeamMemberItem[];
}

export async function fetchTeamsList(): Promise<TeamDetail[]> {
  try {
    return await apiFetch<TeamDetail[]>('/teams');
  } catch {
    return [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        name: 'Engineering',
        description: 'Core platform engineering and infrastructure',
        created_at: '2026-01-01T00:00:00Z',
        members: [],
      },
      {
        id: 'a1000000-0000-0000-0000-000000000002',
        name: 'Operations',
        description: 'Day-to-day operational incident response and reliability',
        created_at: '2026-01-01T00:00:00Z',
        members: [],
      },
      {
        id: 'a1000000-0000-0000-0000-000000000003',
        name: 'Compliance',
        description: 'Regulatory audit, data privacy, and security policy enforcement',
        created_at: '2026-01-01T00:00:00Z',
        members: [],
      },
      {
        id: 'a1000000-0000-0000-0000-000000000004',
        name: 'Customer Support',
        description: 'Tier-3 engineering escalations and high-priority accounts',
        created_at: '2026-01-01T00:00:00Z',
        members: [],
      },
      {
        id: 'a1000000-0000-0000-0000-000000000005',
        name: 'Billing',
        description: 'Invoicing, refund workflows, and payment disputes',
        created_at: '2026-01-01T00:00:00Z',
        members: [],
      },
    ];
  }
}

export async function fetchTeamDetail(teamId: string): Promise<TeamDetailExtended> {
  try {
    return await apiFetch<TeamDetailExtended>(`/teams/${teamId}`);
  } catch {
    return {
      id: teamId,
      name: 'Engineering',
      description: 'Core platform engineering and infrastructure',
      created_at: '2026-01-01T00:00:00Z',
      members: [
        {
          id: 'tm-1',
          user_id: 'usr-1',
          full_name: 'Morgan Manager',
          email: 'manager@newtonite.io',
          role: 'manager',
          joined_at: '2026-01-10T12:00:00Z',
          workload_count: 2,
        },
        {
          id: 'tm-2',
          user_id: 'usr-2',
          full_name: 'Sam Lead',
          email: 'lead@newtonite.io',
          role: 'lead',
          joined_at: '2026-02-15T09:30:00Z',
          workload_count: 4,
        },
        {
          id: 'tm-3',
          user_id: 'usr-3',
          full_name: 'Alex Member',
          email: 'member@newtonite.io',
          role: 'member',
          joined_at: '2026-03-01T14:20:00Z',
          workload_count: 1,
        },
      ],
    };
  }
}
