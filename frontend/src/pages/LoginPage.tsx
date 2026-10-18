import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth, DEMO_PERSONAS, DemoPersona } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile,
    isAuthenticated,
    signInWithGoogle,
    signInWithDemo,
    signOut,
  } = useAuth();

  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check URL parameters for potential OAuth errors
  useEffect(() => {
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const errorDesc =
      hashParams.get('error_description') ||
      searchParams.get('error_description') ||
      hashParams.get('error') ||
      searchParams.get('error');

    if (errorDesc) {
      setAuthError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
    }
  }, []);

  const handleDemoLogin = (persona: DemoPersona) => {
    signInWithDemo(persona);
    const target = (location.state as any)?.from?.pathname || '/app/triage';
    navigate(target);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setAuthError(
          error.message ||
            'Unable to initiate Google OAuth. Please check Supabase Google provider configuration or use Demo Access below.'
        );
        setIsGoogleLoading(false);
      }
      // If no error, browser redirects to Google OAuth endpoint automatically
    } catch (err: any) {
      setAuthError(
        err.message || 'An unexpected error occurred during Google Sign-In.'
      );
      setIsGoogleLoading(false);
    }
  };

  const handleProceedAuthenticated = () => {
    const target = (location.state as any)?.from?.pathname || '/app/triage';
    navigate(target);
  };

  return (
    <div className="login-page">
      {/* Left Panel — Visual / Brand */}
      <div className="login-visual-panel">
        <div className="login-visual-bg" />
        <div className="login-visual-content">
          <Link to="/" className="login-back-brand">
            <ShieldAlert size={24} />
            <span>Lockstep</span>
          </Link>

          <div className="login-visual-hero">
            <h2 className="login-visual-title">
              Operational Triage.{' '}
              <span className="login-gradient-text">Zero Race Conditions.</span>
            </h2>
            <p className="login-visual-subtitle">
              An operations platform where every claim is atomic, every update is
              version-tracked, and every transition is role-governed.
            </p>
          </div>

          {/* Animated feature list */}
          <div className="login-visual-features">
            <div className="login-feature-item">
              <CheckCircle2 size={16} className="login-feature-check" />
              <span>Atomic SQL claiming — one winner guaranteed</span>
            </div>
            <div className="login-feature-item">
              <CheckCircle2 size={16} className="login-feature-check" />
              <span>OCC version tracking with visual diff reconciliation</span>
            </div>
            <div className="login-feature-item">
              <CheckCircle2 size={16} className="login-feature-check" />
              <span>RBAC state machine (member → lead → manager)</span>
            </div>
            <div className="login-feature-item">
              <CheckCircle2 size={16} className="login-feature-check" />
              <span>Idempotency engine for double-click protection</span>
            </div>
            <div className="login-feature-item">
              <CheckCircle2 size={16} className="login-feature-check" />
              <span>Immutable append-only audit trail</span>
            </div>
          </div>

          {/* Terminal preview */}
          <div className="login-terminal">
            <div className="login-terminal-header">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <pre className="login-terminal-body">
              <code>
{`$ pytest -v
22 passed in 0.12s
✓ test_concurrent_claim_race
✓ test_occ_version_conflict_409
✓ test_rbac_transition_denied
✓ test_idempotency_replay`}
              </code>
            </pre>
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-form-header">
            <h1 className="login-form-title">Welcome Back</h1>
            <p className="login-form-subtitle">Sign in to access Mission Control</p>
          </div>

          {/* Active Session Notification if already authenticated */}
          {isAuthenticated && profile && (
            <div className="login-active-session-card">
              <div className="active-session-header">
                <UserCheck size={18} className="active-session-icon" />
                <span>Active Session Detected</span>
              </div>
              <div className="active-session-details">
                <span className="active-session-name">{profile.name}</span>
                <span className="active-session-email">({profile.email})</span>
                <span className={`active-session-role role-${profile.role}`}>
                  {profile.role.toUpperCase()}
                </span>
              </div>
              <div className="active-session-actions">
                <button
                  className="btn btn-primary active-session-proceed"
                  onClick={handleProceedAuthenticated}
                >
                  Enter Mission Control <ArrowRight size={14} />
                </button>
                <button
                  className="btn btn-ghost active-session-signout"
                  onClick={signOut}
                >
                  <LogOut size={14} /> Switch Operator
                </button>
              </div>
            </div>
          )}

          {/* Auth Notice / Error Banner if any */}
          {authError && (
            <div className="login-error-banner">
              <AlertTriangle size={18} className="login-error-icon" />
              <div className="login-error-body">
                <strong>OAuth Notice:</strong> {authError}
                <div className="login-error-hint">
                  To connect Google OAuth in local dev, configure your Google Client ID in Supabase. You can continue instantly with Demo Access below.
                </div>
              </div>
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            className={`login-google-btn ${isGoogleLoading ? 'btn-loading' : ''}`}
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 size={18} className="spin-loader" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">or use a demo operator</span>
            <div className="login-divider-line" />
          </div>

          {/* Demo Persona Selector */}
          <div className="login-personas">
            <p className="login-personas-label">
              <Zap size={14} /> Quick Demo Access — Select an Operator
            </p>
            {DEMO_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                className={`login-persona-card ${hoveredPersona === persona.id ? 'persona-hovered' : ''}`}
                onMouseEnter={() => setHoveredPersona(persona.id)}
                onMouseLeave={() => setHoveredPersona(null)}
                onClick={() => handleDemoLogin(persona)}
              >
                <div className={`persona-avatar persona-avatar-${persona.role}`}>
                  {persona.avatar}
                </div>
                <div className="persona-details">
                  <span className="persona-name">{persona.name}</span>
                  <span className="persona-email">{persona.email}</span>
                </div>
                <div className={`persona-role-badge role-${persona.role}`}>
                  {persona.role.toUpperCase()}
                </div>
                <ArrowRight size={16} className="persona-arrow" />
              </button>
            ))}
          </div>

          {/* Footer text */}
          <p className="login-footer-text">
            Built with{' '}
            <span className="login-footer-highlight">FastAPI + Supabase + React</span>
            {' '}— 22 passing tests
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
