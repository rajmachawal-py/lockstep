import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { AppNavbar } from '../components/layout/AppNavbar';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Mock telemetry data tailored for high-pressure incident rooms
  const velocityData = [
    { period: 'Mon', created: 18, resolved: 19 },
    { period: 'Tue', created: 26, resolved: 24 },
    { period: 'Wed', created: 35, resolved: 33 },
    { period: 'Thu', created: 22, resolved: 25 },
    { period: 'Fri', created: 41, resolved: 39 },
    { period: 'Sat', created: 12, resolved: 14 },
    { period: 'Sun', created: 15, resolved: 16 },
  ];

  const teamWorkloads = [
    { name: 'Core Platform Engineering', count: 14, max: 20, activeClaim: 'Alex Member', color: '#00f0ff' },
    { name: 'Site Reliability Operations', count: 9, max: 20, activeClaim: 'Sam Lead', color: '#3b82f6' },
    { name: 'Security & Compliance', count: 6, max: 15, activeClaim: 'Morgan Manager', color: '#10b981' },
    { name: 'Enterprise Support', count: 12, max: 20, activeClaim: 'Tier-3 Escalation', color: '#f59e0b' },
    { name: 'Billing Operations', count: 5, max: 10, activeClaim: 'Dispatcher Ops', color: '#8b5cf6' },
  ];

  const statusDistribution = [
    { status: 'Open (Unclaimed)', count: 8, color: '#3b82f6', percent: 18 },
    { status: 'In Investigation', count: 16, color: '#f59e0b', percent: 36 },
    { status: 'Pending Approval', count: 6, color: '#8b5cf6', percent: 14 },
    { status: 'Approved', count: 5, color: '#10b981', percent: 11 },
    { status: 'Resolved & Closed', count: 9, color: '#06b6d4', percent: 21 },
  ];

  return (
    <div className="analytics-page">
      <AppNavbar
        actionButton={
          <button
            className={`btn btn-ghost header-refresh-btn ${isRefreshing ? 'spin-btn' : ''}`}
            onClick={handleRefresh}
            title="Refresh Telemetry Metrics"
          >
            <RefreshCw size={14} /> <span>Refresh</span>
          </button>
        }
      />

      <main className="app-container analytics-container">
        {/* Page Header */}
        <div className="page-header-row">
          <div>
            <h1 className="page-title">
              Telemetry & Incident Analytics
            </h1>
            <p className="page-subtitle">
              Real-time operational health, SLA compliance velocity, and concurrency conflict telemetry.
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="timeframe-toggle-group">
            <button
              className={`timeframe-btn ${timeRange === '24h' ? 'timeframe-active' : ''}`}
              onClick={() => setTimeRange('24h')}
            >
              24 Hours
            </button>
            <button
              className={`timeframe-btn ${timeRange === '7d' ? 'timeframe-active' : ''}`}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </button>
            <button
              className={`timeframe-btn ${timeRange === '30d' ? 'timeframe-active' : ''}`}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* 4 SLA & Metric Cards */}
        <div className="analytics-metrics-grid">
          {/* Card 1: MTTA */}
          <div className="analytics-metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Mean Time to Acknowledge</span>
              <Clock size={16} className="metric-icon metric-icon-cyan" />
            </div>
            <div className="metric-value-row">
              <span className="metric-value">1m 18s</span>
              <span className="metric-trend trend-positive">
                <ArrowDownRight size={14} /> -28%
              </span>
            </div>
            <div className="metric-footer">
              <span className="metric-target">Target: &lt; 3m 00s</span>
              <span className="metric-status-pill pill-success">98.2% SLA</span>
            </div>
          </div>

          {/* Card 2: MTTR */}
          <div className="analytics-metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Mean Time to Resolution</span>
              <TrendingUp size={16} className="metric-icon metric-icon-indigo" />
            </div>
            <div className="metric-value-row">
              <span className="metric-value">14m 42s</span>
              <span className="metric-trend trend-positive">
                <ArrowDownRight size={14} /> -16%
              </span>
            </div>
            <div className="metric-footer">
              <span className="metric-target">Sev-1 Median: 8m 10s</span>
              <span className="metric-status-pill pill-success">Optimal</span>
            </div>
          </div>

          {/* Card 3: Active Under Investigation */}
          <div className="analytics-metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Active Incidents In Flight</span>
              <AlertTriangle size={16} className="metric-icon metric-icon-amber" />
            </div>
            <div className="metric-value-row">
              <span className="metric-value">7 Incidents</span>
              <span className="metric-trend trend-neutral">
                <Activity size={14} /> Active
              </span>
            </div>
            <div className="metric-footer">
              <div className="severity-pill-row">
                <span className="sev-dot sev-1" title="Sev-1 Critical: 1">1x S1</span>
                <span className="sev-dot sev-2" title="Sev-2 Major: 2">2x S2</span>
                <span className="sev-dot sev-3" title="Sev-3 Minor: 4">4x S3</span>
              </div>
              <span className="metric-status-pill pill-warning">Under Investigation</span>
            </div>
          </div>

          {/* Card 4: OCC Collisions Averted */}
          <div className="analytics-metric-card">
            <div className="metric-card-header">
              <span className="metric-label">OCC Collisions Averted</span>
              <ShieldCheck size={16} className="metric-icon metric-icon-emerald" />
            </div>
            <div className="metric-value-row">
              <span className="metric-value">148 Averted</span>
              <span className="metric-trend trend-positive">
                <Zap size={14} /> 100% Locked
              </span>
            </div>
            <div className="metric-footer">
              <span className="metric-target">0 Stale Overwrites</span>
              <span className="metric-status-pill pill-emerald">409 Protected</span>
            </div>
          </div>
        </div>

        {/* Mid-Row: Ingestion Velocity & Team Workload */}
        <div className="analytics-charts-grid">
          {/* Chart 1: Velocity Timeline */}
          <div className="analytics-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Incident Ingestion vs Resolution Velocity</h3>
                <p className="panel-desc">Created items compared against resolved workflows over time.</p>
              </div>
              <div className="legend-row">
                <span className="legend-item"><span className="legend-box legend-created" /> Ingested</span>
                <span className="legend-item"><span className="legend-box legend-resolved" /> Resolved</span>
              </div>
            </div>

            <div className="velocity-bars-container">
              {velocityData.map((d) => (
                <div key={d.period} className="velocity-bar-col">
                  <div className="bar-pair">
                    <div
                      className="bar-fill bar-fill-created"
                      style={{ height: `${(d.created / 50) * 160}px` }}
                      title={`Created: ${d.created}`}
                    >
                      <span className="bar-tooltip">{d.created}</span>
                    </div>
                    <div
                      className="bar-fill bar-fill-resolved"
                      style={{ height: `${(d.resolved / 50) * 160}px` }}
                      title={`Resolved: ${d.resolved}`}
                    >
                      <span className="bar-tooltip">{d.resolved}</span>
                    </div>
                  </div>
                  <span className="bar-label">{d.period}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Team Workload Distribution */}
          <div className="analytics-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Active Team Workload Distribution</h3>
                <p className="panel-desc">Claim volume and operator capacity across teams.</p>
              </div>
              <span className="panel-tag">Capacity: 72%</span>
            </div>

            <div className="workload-list">
              {teamWorkloads.map((team) => {
                const pct = Math.round((team.count / team.max) * 100);
                return (
                  <div key={team.name} className="workload-item">
                    <div className="workload-top">
                      <span className="workload-name">{team.name}</span>
                      <span className="workload-nums">
                        <strong>{team.count}</strong> / {team.max} items
                      </span>
                    </div>
                    <div className="workload-bar-track">
                      <div
                        className="workload-bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: team.color,
                        }}
                      />
                    </div>
                    <div className="workload-meta">
                      <span>Primary on-call: {team.activeClaim}</span>
                      <span>{pct}% load</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Row: Status Distribution & Engine Telemetry */}
        <div className="analytics-bottom-grid">
          {/* Status Breakdown Panel */}
          <div className="analytics-panel">
            <div className="panel-header">
              <h3 className="panel-title">Operational Workflow Distribution</h3>
              <span className="panel-tag">44 Total Items</span>
            </div>

            <div className="status-dist-container">
              {statusDistribution.map((st) => (
                <div key={st.status} className="dist-row">
                  <div className="dist-label-col">
                    <span className="dist-color-dot" style={{ backgroundColor: st.color }} />
                    <span className="dist-name">{st.status}</span>
                  </div>
                  <div className="dist-bar-track">
                    <div
                      className="dist-bar-fill"
                      style={{ width: `${st.percent}%`, backgroundColor: st.color }}
                    />
                  </div>
                  <span className="dist-count">{st.count} items ({st.percent}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Engine Latency & Safety Guarantees */}
          <div className="analytics-panel">
            <div className="panel-header">
              <h3 className="panel-title">Non-CRUD Engine Integrity Metrics</h3>
              <span className="panel-tag tag-cyan">22/22 Automated Tests Verified</span>
            </div>

            <div className="telemetry-integrity-list">
              <div className="integrity-row">
                <div className="integrity-info">
                  <span className="integrity-title">Atomic Claim Lock Latency</span>
                  <span className="integrity-desc">PostgreSQL conditional row lock (WHERE assignee_id IS NULL)</span>
                </div>
                <span className="integrity-val val-cyan">11.4 ms</span>
              </div>

              <div className="integrity-row">
                <div className="integrity-info">
                  <span className="integrity-title">OCC Version Reconciliation Rate</span>
                  <span className="integrity-desc">Conflict detection and field-level merge resolution</span>
                </div>
                <span className="integrity-val val-emerald">100% Clean</span>
              </div>

              <div className="integrity-row">
                <div className="integrity-info">
                  <span className="integrity-title">Idempotency Duplicate Replay Cache</span>
                  <span className="integrity-desc">Deduplication window for high-pressure double-dispatches</span>
                </div>
                <span className="integrity-val val-indigo">1,024 Entries</span>
              </div>

              <div className="integrity-row">
                <div className="integrity-info">
                  <span className="integrity-title">Immutable Audit Trail Ingestion</span>
                  <span className="integrity-desc">Non-blocking background commit with zero data loss</span>
                </div>
                <span className="integrity-val val-emerald">0 Drops</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AnalyticsPage;
