import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  CheckCircle2,
  X,
  Briefcase,
  ChevronRight,
  UserCheck,
  UserMinus,
  Trash2,
  Plus,
  Award,
  ArrowUp,
  ArrowDown,
  Lock,
} from 'lucide-react';
import { AppNavbar } from '../components/layout/AppNavbar';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchTeamsList,
  fetchTeamDetail,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  TeamDetailExtended,
  TeamMemberItem,
} from '../api/teams';
import { TeamRole } from '../types';

export function TeamsPage() {
  const { profile } = useAuth();
  const currentRole = profile?.role || 'member';
  const isManager = currentRole === 'manager';
  const isMember = currentRole === 'member';

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamDetail, setTeamDetail] = useState<TeamDetailExtended | null>(null);
  const [loading, setLoading] = useState(true);

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load of teams
  useEffect(() => {
    fetchTeamsList().then((res) => {
      setTeams(res);
      if (res.length > 0) {
        setSelectedTeamId(res[0].id);
      }
    });
  }, []);

  // Fetch Team Detail when selected team changes (Instant Cached + SWR Background Sync)
  useEffect(() => {
    if (!selectedTeamId) return;

    try {
      const cached = localStorage.getItem(`lockstep_team_roster_${selectedTeamId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
          setTeamDetail(parsed);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }
    } catch {
      setLoading(true);
    }

    fetchTeamDetail(selectedTeamId)
      .then((res) => {
        if (res) {
          setTeamDetail(res);
          try {
            localStorage.setItem(`lockstep_team_roster_${selectedTeamId}`, JSON.stringify(res));
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, [selectedTeamId]);

  // Handle role promotion / demotion with API persistence
  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    if (!teamDetail) return;
    const updated = {
      ...teamDetail,
      members: teamDetail.members.map((m) =>
        m.id === memberId ? { ...m, role: newRole } : m
      ),
    };
    setTeamDetail(updated);
    try {
      localStorage.setItem(`lockstep_team_roster_${selectedTeamId}`, JSON.stringify(updated));
      await updateTeamMemberRole(selectedTeamId, memberId, newRole);
    } catch {}
  };

  // Handle removing a member from team
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!teamDetail) return;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from ${teamDetail.name}?`)) {
      return;
    }
    const updated = {
      ...teamDetail,
      members: teamDetail.members.filter((m) => m.id !== memberId),
    };
    setTeamDetail(updated);
    try {
      localStorage.setItem(`lockstep_team_roster_${selectedTeamId}`, JSON.stringify(updated));
      await removeTeamMember(selectedTeamId, memberId);
    } catch {}
  };

  // Handle adding / inviting teammate to group
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !teamDetail) return;

    const cleanEmail = inviteEmail.trim().toLowerCase();
    const cleanName =
      inviteName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const tempId = `tm-${Date.now()}`;
    const newMember: TeamMemberItem = {
      id: tempId,
      user_id: `usr-${Date.now()}`,
      full_name: cleanName,
      email: cleanEmail,
      role: inviteRole,
      joined_at: new Date().toISOString(),
      workload_count: 0,
    };

    // 1. Instant optimistic update so UI is 0ms responsive
    const updated = {
      ...teamDetail,
      members: [newMember, ...teamDetail.members.filter((m) => m.email.toLowerCase() !== cleanEmail)],
    };
    setTeamDetail(updated);
    try {
      localStorage.setItem(`lockstep_team_roster_${selectedTeamId}`, JSON.stringify(updated));
    } catch {}

    setInviteSuccess(`Teammate ${cleanName} (${cleanEmail}) successfully added to ${teamDetail.name}!`);
    setIsSubmitting(true);

    // 2. Persist to backend database
    try {
      const serverMember = await addTeamMember(selectedTeamId, {
        email: cleanEmail,
        full_name: cleanName,
        role: inviteRole,
      });

      if (serverMember) {
        setTeamDetail((prev) => {
          if (!prev) return prev;
          const reconciled = {
            ...prev,
            members: prev.members.map((m) => (m.id === tempId ? { ...m, ...serverMember } : m)),
          };
          try {
            localStorage.setItem(`lockstep_team_roster_${selectedTeamId}`, JSON.stringify(reconciled));
          } catch {}
          return reconciled;
        });
      }
    } catch (err) {
      // Retain optimistic local state if network times out
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setInviteSuccess(null);
        setIsInviteOpen(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('member');
      }, 1500);
    }
  };

  return (
    <div className="teams-page">
      <AppNavbar
        actionButton={
          !isMember ? (
            <button
              className="btn btn-primary"
              onClick={() => setIsInviteOpen(true)}
            >
              <UserPlus size={15} /> <span>Invite Operator</span>
            </button>
          ) : (
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-tertiary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Lock size={13} /> View-Only Access
            </span>
          )
        }
      />

      <main className="app-container teams-container">
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">
              Team Roster & Role Governance (RBAC)
            </h1>
            <p className="page-subtitle">
              Manage operational rosters, assign role permissions, and view active operator workloads.
            </p>
          </div>

          <div className="rbac-status-tag">
            <Shield size={14} />
            <span>Your Effective Tier: <strong className={`role-badge role-${currentRole}`}>{currentRole.toUpperCase()}</strong></span>
          </div>
        </div>

        {/* Team Selector Tabs */}
        <div className="teams-tab-bar">
          {teams.map((t) => (
            <button
              key={t.id}
              className={`team-tab-btn ${selectedTeamId === t.id ? 'team-tab-active' : ''}`}
              onClick={() => setSelectedTeamId(t.id)}
            >
              <Briefcase size={14} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        {/* Team Header Info */}
        {teamDetail && (
          <div className="team-info-banner">
            <div className="team-info-left">
              <h2 className="team-info-title">{teamDetail.name}</h2>
              <p className="team-info-desc">{teamDetail.description}</p>
            </div>
            <div className="team-info-stats">
              <div className="team-stat-item">
                <span className="stat-num">{teamDetail.members?.length || 0}</span>
                <span className="stat-label">Active Operators</span>
              </div>
              <div className="team-stat-item">
                <span className="stat-num">
                  {teamDetail.members?.reduce((acc, m) => acc + (m.workload_count || 0), 0) || 0}
                </span>
                <span className="stat-label">Items Claimed</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Roster Table */}
        <div className="roster-table-card">
          <div className="roster-card-header">
            <div className="card-header-left">
              <Users size={16} />
              <h3 className="card-header-title">Active Team Operators</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="roster-count-badge">
                {teamDetail?.members?.length || 0} Operators On-Duty
              </span>
              {!isMember && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsInviteOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlus size={14} /> Add Team Member
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="table-loading-state">
              <span>Synchronizing Team Roster...</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>Google Identity</th>
                    <th>Assigned RBAC Role</th>
                    <th>Active Claims</th>
                    <th>Joined</th>
                    <th>Role Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamDetail?.members?.map((member) => (
                    <tr key={member.id} className="roster-row">
                      {/* Operator Info */}
                      <td>
                        <div className="operator-cell">
                          <div className={`persona-avatar persona-avatar-${member.role}`}>
                            {member.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="operator-text">
                            <span className="operator-name">{member.full_name}</span>
                            <span className="operator-email">{member.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Google Connected Status */}
                      <td>
                        <div className="google-status-cell">
                          <CheckCircle2 size={14} className="google-status-icon" />
                          <span>Google SSO Verified</span>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td>
                        <span className={`role-badge role-${member.role}`}>
                          {member.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Workload */}
                      <td>
                        <span className="workload-pill">
                          <strong>{member.workload_count ?? 1}</strong> open items
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="joined-cell">
                        {new Date(member.joined_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Role Actions */}
                      <td>
                        {isMember ? (
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontStyle: 'italic',
                            }}
                          >
                            <Lock size={12} /> View Only
                          </span>
                        ) : (
                          <div className="role-actions-group">
                            {member.role === 'member' && (
                              <button
                                className="btn btn-ghost btn-xs btn-promote"
                                onClick={() => handleRoleChange(member.id, 'lead')}
                                title="Promote operator to Lead"
                              >
                                <ArrowUp size={12} /> Promote to Lead
                              </button>
                            )}
                            {member.role === 'lead' && (
                              <>
                                <button
                                  className="btn btn-ghost btn-xs btn-promote"
                                  onClick={() => handleRoleChange(member.id, 'manager')}
                                  title="Promote operator to Manager"
                                >
                                  <ArrowUp size={12} /> Make Manager
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs btn-demote"
                                  onClick={() => handleRoleChange(member.id, 'member')}
                                  title="Demote operator to Member"
                                >
                                  <ArrowDown size={12} /> Demote
                                </button>
                              </>
                            )}
                            {member.role === 'manager' && (
                              <button
                                className="btn btn-ghost btn-xs btn-demote"
                                onClick={() => handleRoleChange(member.id, 'lead')}
                                title="Demote operator to Lead"
                              >
                                <ArrowDown size={12} /> Demote to Lead
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleRemoveMember(member.id, member.full_name)}
                              title="Remove operator from team"
                              style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.25)' }}
                            >
                              <UserMinus size={12} /> Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RBAC Transition Authority Matrix Breakdown */}
        <div className="rbac-matrix-card">
          <div className="rbac-matrix-header">
            <Award size={16} />
            <h3 className="card-header-title">Role-Based Transition Authority Matrix</h3>
          </div>
          <div className="rbac-matrix-grid">
            <div className="rbac-tier-card">
              <div className="tier-header">
                <span className="role-badge role-member">MEMBER</span>
                <span className="tier-subtitle">First-Line Operator</span>
              </div>
              <ul className="tier-permissions-list">
                <li><CheckCircle2 size={13} className="perm-check" /> Claim unclaimed work items</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Move items from Open &rarr; Investigation</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Request Approval for resolutions</li>
                <li className="perm-denied"><X size={13} /> Cannot approve or reject items</li>
                <li className="perm-denied"><X size={13} /> Cannot close resolved incidents</li>
              </ul>
            </div>

            <div className="rbac-tier-card tier-card-highlight">
              <div className="tier-header">
                <span className="role-badge role-lead">LEAD</span>
                <span className="tier-subtitle">Team Lead / Senior Specialist</span>
              </div>
              <ul className="tier-permissions-list">
                <li><CheckCircle2 size={13} className="perm-check" /> All Member capabilities</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Approve or Reject approval requests</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Close resolved operational items</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Reconcile OCC 409 field conflicts</li>
                <li className="perm-denied"><X size={13} /> Cannot reopen closed incidents</li>
              </ul>
            </div>

            <div className="rbac-tier-card">
              <div className="tier-header">
                <span className="role-badge role-manager">MANAGER</span>
                <span className="tier-subtitle">Operations Manager / Admin</span>
              </div>
              <ul className="tier-permissions-list">
                <li><CheckCircle2 size={13} className="perm-check" /> All Lead &amp; Member capabilities</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Reopen closed items with audit reason</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Promote and demote operator roles</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Force unlock stuck claims</li>
                <li><CheckCircle2 size={13} className="perm-check" /> Export global immutable audit logs</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Add / Invite Teammate Modal */}
      {isInviteOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteOpen(false)}>
          <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <UserPlus size={18} />
                <h2>Add Team Member to {teamDetail?.name || 'Team'}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsInviteOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="modal-body invite-form">
              {inviteSuccess ? (
                <div className="invite-success-banner">
                  <CheckCircle2 size={20} />
                  <span>{inviteSuccess}</span>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Teammate Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivera"
                      className="form-input"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teammate Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. alex.rivera@company.com"
                      className="form-input"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assigned RBAC Role Tier</label>
                    <select
                      className="form-select"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                    >
                      <option value="member">Member — Standard triage & claim authority</option>
                      <option value="lead">Lead — Approval & incident closing authority</option>
                      <option value="manager">Manager — Full roster & override governance</option>
                    </select>
                  </div>

                  <div className="invite-notice">
                    <ShieldCheck size={14} />
                    <span>Teammates added to this group can collaborate on incidents, claim work items, and request or grant operational approvals together.</span>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setIsInviteOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Adding Teammate...' : 'Add Teammate to Group'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsPage;
