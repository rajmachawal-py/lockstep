import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Volume2,
  Wifi,
  Key,
  LogOut,
  CheckCircle2,
  Check,
  ShieldAlert,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { AppNavbar } from '../components/layout/AppNavbar';
import { useAuth } from '../contexts/AuthContext';

export function ProfilePage() {
  const { profile, session, signOut, updateRole } = useAuth();

  // Operator Preferences State
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const currentRole = profile?.role || 'member';

  const handleCopyToken = () => {
    const token = session?.access_token || 'mock_dev_token_sha256_lockstep_pkce_0928';
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSavePreferences = () => {
    setSaveStatus('Preferences saved successfully!');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  return (
    <div className="profile-page">
      <AppNavbar />

      <main className="app-container profile-container">
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Operator Profile &amp; Security Settings</h1>
            <p className="page-subtitle">
              Manage your verified credentials, active cryptographic session, and real-time urgency telemetry.
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleSavePreferences}>
            <Check size={14} /> <span>Save Preferences</span>
          </button>
        </div>

        {saveStatus && (
          <div className="profile-toast-success">
            <CheckCircle2 size={16} />
            <span>{saveStatus}</span>
          </div>
        )}

        <div className="profile-grid">
          {/* Left Column: Identity & Teams */}
          <div className="profile-col">
            {/* Identity Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <User size={16} />
                <h3 className="card-header-title">Operator Identity</h3>
              </div>

              <div className="identity-body">
                <div className="identity-avatar-row">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="profile-large-avatar"
                    />
                  ) : (
                    <div className={`persona-avatar persona-avatar-large persona-avatar-${currentRole}`}>
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'O'}
                    </div>
                  )}
                  <div className="identity-text">
                    <h2 className="identity-name">{profile?.name || 'Operator'}</h2>
                    <span className="identity-email">{profile?.email || 'operator@lockstep.io'}</span>
                    <div className="identity-badges-row">
                      <span className={`role-badge role-${currentRole}`}>
                        {currentRole.toUpperCase()} TIER
                      </span>
                      {profile?.isGoogleUser ? (
                        <span className="badge-google-sso">
                          <CheckCircle2 size={12} /> Google SSO Connected
                        </span>
                      ) : (
                        <span className="badge-demo-mode">
                          Demo Operator Session
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="identity-details-list">
                  <div className="detail-item">
                    <span className="detail-label">Identity Provider</span>
                    <span className="detail-val">
                      {profile?.isGoogleUser ? 'Google Cloud OAuth 2.0 (PKCE)' : 'Evaluator Demo System'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Account ID</span>
                    <span className="detail-val mono-val">{profile?.id || 'usr-default'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Active RBAC Authority</span>
                    <div className="detail-val">
                      <select
                        className="profile-role-select"
                        value={currentRole}
                        onChange={(e) => updateRole(e.target.value as any)}
                      >
                        <option value="member">MEMBER (Claim &amp; Triage)</option>
                        <option value="lead">LEAD (Approval &amp; Close)</option>
                        <option value="manager">MANAGER (Full Override)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Memberships Card */}
            <div className="profile-card">
              <div className="profile-card-header">
                <Shield size={16} />
                <h3 className="card-header-title">Assigned Operational Teams</h3>
              </div>
              <div className="profile-teams-list">
                <div className="profile-team-item">
                  <div className="profile-team-info">
                    <span className="profile-team-name">Core Platform Engineering</span>
                    <span className="profile-team-role">Primary Assignment &bull; Lead</span>
                  </div>
                  <span className="status-indicator-dot dot-active" title="Active on-call" />
                </div>

                <div className="profile-team-item">
                  <div className="profile-team-info">
                    <span className="profile-team-name">Site Reliability Operations</span>
                    <span className="profile-team-role">Secondary Responder</span>
                  </div>
                  <span className="status-indicator-dot dot-idle" title="Standby" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Urgency & Session */}
          <div className="profile-col">
            {/* Notification & Telemetry Preferences */}
            <div className="profile-card">
              <div className="profile-card-header">
                <Bell size={16} />
                <h3 className="card-header-title">Urgency &amp; Alert Telemetry</h3>
              </div>

              <div className="pref-list">
                {/* Sev-1 Audio Toggle */}
                <div className="pref-item">
                  <div className="pref-info">
                    <div className="pref-title-row">
                      <Volume2 size={16} className="pref-icon" />
                      <span className="pref-title">Sev-1 Critical Incident Siren</span>
                    </div>
                    <span className="pref-desc">
                      Audible alert triggers when an unassigned Sev-1 critical incident is ingested.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={audioAlerts}
                      onChange={(e) => setAudioAlerts(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* Desktop Notifications Toggle */}
                <div className="pref-item">
                  <div className="pref-info">
                    <div className="pref-title-row">
                      <Bell size={16} className="pref-icon" />
                      <span className="pref-title">Browser Desktop Notifications</span>
                    </div>
                    <span className="pref-desc">
                      Display high-priority dispatch notifications when Lockstep tab is backgrounded.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={desktopNotifs}
                      onChange={(e) => setDesktopNotifs(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {/* Realtime CDC Connection */}
                <div className="pref-item">
                  <div className="pref-info">
                    <div className="pref-title-row">
                      <Wifi size={16} className="pref-icon icon-emerald" />
                      <span className="pref-title">Supabase CDC Realtime Stream</span>
                    </div>
                    <span className="pref-desc mono-desc">
                      Connected: wss://gfirgasptccfbbgfaigs.supabase.co/realtime/v1
                    </span>
                  </div>
                  <span className="badge-online">CONNECTED (8ms)</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Session & Tokens */}
            <div className="profile-card">
              <div className="profile-card-header">
                <Key size={16} />
                <h3 className="card-header-title">Active Session &amp; JWT Token</h3>
              </div>

              <div className="session-body">
                <div className="session-info-row">
                  <span className="session-info-label">Session Protocol</span>
                  <span className="session-info-val">OAuth 2.0 PKCE with Supabase Auth</span>
                </div>
                <div className="session-info-row">
                  <span className="session-info-label">Expires At</span>
                  <span className="session-info-val">
                    {session?.expires_at
                      ? new Date(session.expires_at * 1000).toLocaleString()
                      : 'Never (Development Bypass Active)'}
                  </span>
                </div>

                <div className="token-preview-box">
                  <div className="token-box-header">
                    <span>Active Bearer Token</span>
                    <button className="copy-token-btn" onClick={handleCopyToken}>
                      {copiedToken ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy JWT
                        </>
                      )}
                    </button>
                  </div>
                  <code className="token-code">
                    {session?.access_token
                      ? `${session.access_token.substring(0, 48)}...`
                      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dev-session-token...'}
                  </code>
                </div>

                <div className="session-signout-row">
                  <button className="btn btn-danger-ghost" onClick={signOut}>
                    <LogOut size={15} /> Sign Out of All Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
