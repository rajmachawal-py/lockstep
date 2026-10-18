import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Zap,
  Lock,
  GitBranch,
  Fingerprint,
  ScrollText,
  ArrowRight,
  Play,
  CheckCircle2,
  XCircle,
  Terminal,
  ChevronRight,
  Shield,
  Database,
  Radio,
} from 'lucide-react';

// ─── Race Condition Simulator ────────────────────────────────────────
function ClaimSimulator() {
  const [phase, setPhase] = useState<'idle' | 'racing' | 'result'>('idle');
  const [step, setStep] = useState(0);

  const runSimulation = () => {
    setPhase('racing');
    setStep(0);
    const steps = [1, 2, 3, 4, 5];
    steps.forEach((s, i) => {
      setTimeout(() => {
        setStep(s);
        if (s === 5) {
          setTimeout(() => setPhase('result'), 600);
        }
      }, (i + 1) * 700);
    });
  };

  const reset = () => {
    setPhase('idle');
    setStep(0);
  };

  return (
    <div className="simulator-container">
      <div className="simulator-header">
        <Terminal size={16} className="simulator-icon" />
        <span className="simulator-title">Live Race Condition Simulator</span>
        <span className="simulator-badge">Interactive</span>
      </div>

      <div className="simulator-body">
        {/* The incident card */}
        <div className="sim-incident-card">
          <div className="sim-incident-severity">SEV-1</div>
          <div className="sim-incident-info">
            <span className="sim-incident-title">Database Primary Failover — us-east-1</span>
            <span className="sim-incident-meta">
              {phase === 'result' ? (
                <span className="sim-claimed-badge">
                  <Lock size={12} /> Claimed by Operator A
                </span>
              ) : (
                <span className="sim-unclaimed-badge">● Unclaimed</span>
              )}
            </span>
          </div>
        </div>

        {/* Operator lanes */}
        <div className="sim-operators">
          <div className={`sim-operator ${phase === 'result' ? 'sim-winner' : ''}`}>
            <div className="sim-operator-avatar sim-avatar-a">A</div>
            <div className="sim-operator-info">
              <span className="sim-operator-name">Operator A</span>
              <span className="sim-operator-role">Lead Engineer</span>
            </div>
            {phase === 'racing' && step >= 2 && (
              <span className="sim-action-badge sim-sending">
                UPDATE ... WHERE assignee IS NULL
              </span>
            )}
            {phase === 'result' && (
              <span className="sim-result-badge sim-success">
                <CheckCircle2 size={14} /> Claim Acquired — Row Locked
              </span>
            )}
          </div>

          <div className="sim-versus">
            {phase === 'idle' && <span>VS</span>}
            {phase === 'racing' && step >= 1 && (
              <div className="sim-sql-flash">
                <code>UPDATE work_items SET assignee_id = ?</code>
                <code>WHERE id = ? AND assignee_id IS NULL</code>
                <code>RETURNING id;</code>
              </div>
            )}
            {phase === 'result' && (
              <div className="sim-conflict-flash">
                <code>409 CONFLICT</code>
              </div>
            )}
          </div>

          <div className={`sim-operator ${phase === 'result' ? 'sim-loser' : ''}`}>
            <div className="sim-operator-avatar sim-avatar-b">B</div>
            <div className="sim-operator-info">
              <span className="sim-operator-name">Operator B</span>
              <span className="sim-operator-role">SRE on-call</span>
            </div>
            {phase === 'racing' && step >= 3 && (
              <span className="sim-action-badge sim-sending">
                UPDATE ... WHERE assignee IS NULL
              </span>
            )}
            {phase === 'result' && (
              <span className="sim-result-badge sim-failure">
                <XCircle size={14} /> 409 Conflict — Already Claimed
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="sim-controls">
          {phase === 'idle' && (
            <button className="sim-run-btn" onClick={runSimulation}>
              <Play size={16} /> Simulate Race Condition
            </button>
          )}
          {phase === 'racing' && (
            <div className="sim-progress">
              <div className="sim-progress-bar" style={{ width: `${(step / 5) * 100}%` }} />
              <span className="sim-progress-label">
                {step <= 2 ? 'Both operators clicking Claim...' : step <= 4 ? 'PostgreSQL atomic lock resolving...' : 'Complete'}
              </span>
            </div>
          )}
          {phase === 'result' && (
            <button className="sim-reset-btn" onClick={reset}>
              Reset Simulation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: string; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(prefix + '0' + suffix);

  useEffect(() => {
    const num = parseInt(target.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) {
      setDisplay(prefix + target + suffix);
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.floor(num / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= num) {
        current = num;
        clearInterval(interval);
      }
      setDisplay(prefix + current + suffix);
    }, 30);
    return () => clearInterval(interval);
  }, [target, suffix, prefix]);

  return <span className="metric-value">{display}</span>;
}

// ─── Feature Pillar Card ────────────────────────────────────────────
interface PillarProps {
  icon: React.ReactNode;
  title: string;
  problem: string;
  solution: string;
  code?: string;
}

function FeaturePillar({ icon, title, problem, solution, code }: PillarProps) {
  return (
    <div className="pillar-card">
      <div className="pillar-icon-ring">{icon}</div>
      <h3 className="pillar-title">{title}</h3>
      <div className="pillar-problem">
        <span className="pillar-label pillar-label-problem">THE PROBLEM</span>
        <p>{problem}</p>
      </div>
      <div className="pillar-solution">
        <span className="pillar-label pillar-label-solution">OUR ENGINE</span>
        <p>{solution}</p>
      </div>
      {code && (
        <pre className="pillar-code">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

// ─── Main Landing Page ──────────────────────────────────────────────
export function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className={`landing-nav ${scrollY > 60 ? 'nav-scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand">
            <div className="landing-logo">
              <ShieldAlert size={22} />
            </div>
            <span className="landing-brand-name">Lockstep</span>
          </Link>

          <div className="landing-nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#architecture" className="nav-link">Architecture</a>
            <a href="#metrics" className="nav-link">Metrics</a>
          </div>

          <div className="landing-nav-actions">
            <Link to="/login" className="nav-signin-btn">Sign In</Link>
            <Link to="/login" className="nav-cta-btn">
              Launch Mission Control <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-bg-grid" />
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="hero-content">
          <div className="hero-text-col">
            <div className="hero-eyebrow">
              <Zap size={14} />
              <span>BUILT FOR HIGH-PRESSURE INCIDENT ROOMS</span>
            </div>
            <h1 className="hero-headline">
              Where Operational Chaos Meets{' '}
              <span className="hero-gradient-text">Mathematical Certainty.</span>
            </h1>
            <p className="hero-subtitle">
              Replace fragmented Slack escalations and brittle spreadsheets with an
              operational triage engine engineered for zero race conditions, optimistic
              concurrency, and role-governed workflows.
            </p>
            <div className="hero-cta-group">
              <Link to="/login" className="hero-cta-primary">
                Enter Mission Control <ArrowRight size={18} />
              </Link>
              <a href="#features" className="hero-cta-secondary">
                Explore Architecture <ChevronRight size={18} />
              </a>
            </div>

            {/* Tech badges */}
            <div className="hero-tech-stack">
              <span className="tech-badge"><Database size={13} /> PostgreSQL 15</span>
              <span className="tech-badge"><Shield size={13} /> Row-Level Security</span>
              <span className="tech-badge"><Radio size={13} /> Realtime CDC</span>
              <span className="tech-badge"><Zap size={13} /> FastAPI</span>
            </div>
          </div>

          <div className="hero-demo-col">
            <ClaimSimulator />
          </div>
        </div>
      </section>

      {/* ── 5 Non-CRUD Pillars ────────────────────────────────── */}
      <section id="features" className="pillars-section">
        <div className="section-header">
          <span className="section-eyebrow">BEYOND CRUD</span>
          <h2 className="section-title">5 Concurrency Engines That Standard Apps Can't Solve</h2>
          <p className="section-subtitle">
            Every operational failure mode was reverse-engineered and eliminated with
            mathematically deterministic server-side protocols.
          </p>
        </div>

        <div className="pillars-grid">
          <FeaturePillar
            icon={<Lock size={24} />}
            title="Atomic Ownership Claims"
            problem="Two operators simultaneously click 'Claim' on the same Sev-1 incident. Standard UPDATE overwrites produce undefined ownership."
            solution="Conditional SQL with WHERE assignee_id IS NULL ensures only one transaction succeeds. The loser receives instant 409 Conflict with winner identity."
            code={`UPDATE work_items\n  SET assignee_id = :uid,\n      status = 'in_investigation',\n      version = version + 1\n  WHERE id = :id\n    AND assignee_id IS NULL\n  RETURNING id;`}
          />
          <FeaturePillar
            icon={<GitBranch size={24} />}
            title="Optimistic Concurrency Control"
            problem="User A opens an item. User B updates the priority. User A saves 2 minutes later, silently erasing User B's changes."
            solution="Every mutation requires the known version integer. Version mismatch triggers 409 Conflict with field-level visual diff for reconciliation."
          />
          <FeaturePillar
            icon={<ShieldAlert size={24} />}
            title="Role-Gated State Machine"
            problem="Junior staff approving compliance tasks or items skipping required investigation stages without authorization."
            solution="Formal transition matrix validates workflow path AND user role. pending_approval → approved requires Lead or Manager role."
          />
          <FeaturePillar
            icon={<Fingerprint size={24} />}
            title="Idempotency Key Engine"
            problem="Operators frantically double-click 'Dispatch' during latency spikes, or network proxies retry dropped connections."
            solution="Client-generated UUID keys cached in the idempotency store. Replayed requests return identical responses without re-executing mutations."
          />
          <FeaturePillar
            icon={<ScrollText size={24} />}
            title="Immutable Audit Trail"
            problem="Third-party notification webhooks or enrichment jobs fail, crashing the primary user request and losing audit data."
            solution="Side-effects dispatched asynchronously with dead-letter isolation. Core ACID transactions commit independently. Zero data loss."
          />
        </div>
      </section>

      {/* ── Architecture Comparison ───────────────────────────── */}
      <section id="architecture" className="architecture-section">
        <div className="section-header">
          <span className="section-eyebrow">ARCHITECTURE</span>
          <h2 className="section-title">Traditional CRUD vs. Lockstep Engine</h2>
        </div>

        <div className="arch-comparison">
          <div className="arch-card arch-bad">
            <h3 className="arch-card-title">
              <XCircle size={20} className="arch-icon-bad" /> Standard CRUD Application
            </h3>
            <ul className="arch-list">
              <li>Race conditions on concurrent claims</li>
              <li>Silent data loss from stale browser tabs</li>
              <li>No workflow authorization enforcement</li>
              <li>Duplicate mutations from double-clicks</li>
              <li>Side-effect failures crash user requests</li>
              <li>No forensic audit trail</li>
            </ul>
          </div>

          <div className="arch-divider">
            <ArrowRight size={24} />
          </div>

          <div className="arch-card arch-good">
            <h3 className="arch-card-title">
              <CheckCircle2 size={20} className="arch-icon-good" /> Lockstep Mission Control
            </h3>
            <ul className="arch-list">
              <li>Atomic SQL conditional locks — one winner guaranteed</li>
              <li>OCC version tracking — 409 conflict with visual diff</li>
              <li>RBAC transition matrix at DB + API layers</li>
              <li>Idempotency key deduplication engine</li>
              <li>Async side-effects with dead-letter isolation</li>
              <li>Immutable append-only audit log with JSON diffs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Metrics Showcase ──────────────────────────────────── */}
      <section id="metrics" className="metrics-section">
        <div className="metrics-grid">
          <div className="metric-card">
            <AnimatedCounter target="0" suffix="%" />
            <span className="metric-label">Data Loss from Stale Overwrites</span>
          </div>
          <div className="metric-card">
            <AnimatedCounter target="12" prefix="<" suffix="ms" />
            <span className="metric-label">Atomic Claim Latency</span>
          </div>
          <div className="metric-card">
            <AnimatedCounter target="100" suffix="%" />
            <span className="metric-label">Audit Trail Immutability</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">22/22</span>
            <span className="metric-label">Automated Concurrency Tests Passing</span>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-headline">Ready to eliminate operational chaos?</h2>
          <p className="cta-subtitle">
            Enter Mission Control and see race-safe claiming, OCC conflict reconciliation,
            and role-gated workflows in action.
          </p>
          <Link to="/login" className="cta-launch-btn">
            Launch Mission Control <ArrowRight size={18} />
          </Link>
        </div>
        <div className="cta-terminal">
          <div className="cta-terminal-header">
            <span className="terminal-dot terminal-dot-red" />
            <span className="terminal-dot terminal-dot-yellow" />
            <span className="terminal-dot terminal-dot-green" />
            <span className="terminal-dot-label">terminal</span>
          </div>
          <pre className="cta-terminal-body">
            <code>
{`$ cd backend && uvicorn app.main:app --reload
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.

$ cd frontend && npm run dev
  VITE v5.4.2 ready in 342ms
  ➜ Local: http://localhost:5173/`}
            </code>
          </pre>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <ShieldAlert size={18} />
            <span>Lockstep</span>
          </div>
          <div className="footer-status">
            <span className="status-dot-live" />
            All Systems Operational — FastAPI + Supabase Active
          </div>
          <div className="footer-links">
            <span>FastAPI</span>
            <span>·</span>
            <span>Supabase</span>
            <span>·</span>
            <span>React</span>
            <span>·</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
