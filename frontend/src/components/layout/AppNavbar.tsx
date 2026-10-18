import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ClipboardList,
  BarChart3,
  Users,
  ScrollText,
  User,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TeamRole } from '../../types';

interface AppNavbarProps {
  actionButton?: React.ReactNode;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ actionButton }) => {
  const navigate = useNavigate();
  const { profile, updateRole, signOut } = useAuth();
  const [livePulse, setLivePulse] = useState(false);

  const currentRole: TeamRole = profile?.role || 'member';

  const handleRoleChange = (newRole: TeamRole) => {
    updateRole(newRole);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/app/triage', label: 'Triage Board', icon: ClipboardList },
    { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/app/teams', label: 'Teams & Rosters', icon: Users },
    { to: '/app/audit', label: 'Audit Explorer', icon: ScrollText },
    { to: '/app/profile', label: 'Operator Profile', icon: User },
  ];

  return (
    <header className="app-header">
      {/* Brand & Section Navigation */}
      <div className="header-left-group">
        <div className="brand-container">
          <Link to="/" className="brand-icon" title="Return to Landing Page">
            <ShieldAlert size={20} color="#ffffff" />
          </Link>
          <div className="brand-titles">
            <div className="brand-title-row">
              <span className="brand-title">Lockstep</span>
              <span className="brand-badge-tag">MISSION CONTROL</span>
              <Link to="/" className="header-landing-link" title="View Landing Page">
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="header-nav-tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `header-nav-link ${isActive ? 'nav-link-active' : ''}`
                }
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Right Telemetry & User Profile */}
      <div className="header-right-group">
        {/* Realtime CDC Status */}
        <div className="header-status-badge">
          <span className={`pulse-dot ${livePulse ? 'live-ping' : ''}`} />
          <span className="status-badge-text">CDC Active</span>
        </div>

        {/* User Profile Pill */}
        <div className="header-user-profile">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="header-avatar-img"
            />
          ) : (
            <div className={`persona-avatar persona-avatar-${currentRole}`}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'O'}
            </div>
          )}
          <div className="header-user-info">
            <div className="header-user-top">
              <span className="header-user-name">{profile?.name || 'Operator'}</span>
              {profile?.isGoogleUser && (
                <span className="header-google-badge">Google SSO</span>
              )}
            </div>
            <span className="header-user-email">
              {profile?.email || 'operator@lockstep.io'}
            </span>
          </div>

          {/* Interactive Role Switcher */}
          <div className="user-persona-selector">
            <select
              className="persona-select"
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
              title="Switch RBAC role to test transition gating"
            >
              <option value="member">MEMBER</option>
              <option value="lead">LEAD</option>
              <option value="manager">MANAGER</option>
            </select>
          </div>

          {/* Sign Out Action */}
          <button
            className="header-signout-btn"
            onClick={handleSignOut}
            title="Sign Out of Mission Control"
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Action button if passed */}
        {actionButton}
      </div>
    </header>
  );
};

export default AppNavbar;
