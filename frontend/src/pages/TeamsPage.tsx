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
  Award,
  ArrowUp,
  ArrowDown,
  Lock,
} from 'lucide-react';
import { AppNavbar } from '../components/layout/AppNavbar';
import { useAuth } from '../contexts/AuthContext';
import { fetchTeamsList, fetchTeamDetail, TeamDetailExtended, TeamMemberItem } from '../api/teams';
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
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    fetchTeamsList().then((res) => {
      setTeams(res);
      if (res.length > 0) {
        setSelectedTeamId(res[0].id);
      }
    });
  }, []);

  // Fetch Team Detail when selected team changes
  useEffect(() => {
    if (!selectedTeamId) return;
    setLoading(true);
    fetchTeamDetail(selectedTeamId).then((res) => {
      setTeamDetail(res);
      setLoading(false);
    });
  }, [selectedTeamId]);

  // Handle role promotion / demotion in UI
  const handleRoleChange = (memberId: string, newRole: TeamRole) => {
    if (!teamDetail) return;
    const updated = {
      ...teamDetail,
      members: teamDetail.members.map((m) =>
        m.id === memberId ? { ...m, role: newRole } : m
      ),
    };
    setTeamDetail(updated);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !teamDetail) return;

    const newMember: TeamMemberItem = {
      id: `tm-${Date.now()}`,
      user_id: `usr-${Date.now()}`,
      full_name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      joined_at: new Date().toISOString(),
      workload_count: 0,
    };

    setTeamDetail({
      ...teamDetail,
      members: [newMember, ...teamDetail.members],
    });

    setInviteSuccess(`Operator invite dispatched to ${inviteEmail}!`);
    setTimeout(() => {
      setInviteSuccess(null);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('member');
    }, 1500);
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
            <span className="roster-count-badge">
              {teamDetail?.members?.length || 0} Operators On-Duty
            </span>
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

      {/* Invite Operator Modal */}
      {isInviteOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteOpen(false)}>
          <div className="modal-container invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <UserPlus size={18} />
                <h2>Invite Operator to {teamDetail?.name || 'Team'}</h2>
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
                    <label className="form-label">Operator Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. dev.lead@company.com"
                      className="form-input"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial RBAC Role Tier</label>
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
                    <span>The invited operator will authenticate via Google OAuth and receive instant role credentials.</span>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setIsInviteOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Dispatch Invite
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
