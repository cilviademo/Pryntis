import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import InsightsPanel from '../components/InsightsPanel';
import { capitalize, objToArray, formatCurrency } from '../utils/formatters';

const CHART_COLORS = ['#6c63ff', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

/* Health score dimension definitions */
const HEALTH_DIMENSIONS = [
  { key: 'subscription', label: 'Subscription', max: 20, missingAction: 'Activate or upgrade subscription tier' },
  { key: 'assets', label: 'Recent Assets', max: 20, missingAction: 'Upload new assets to catalog' },
  { key: 'placements', label: 'Placements', max: 20, missingAction: 'Pursue new sync/licensing opportunities' },
  { key: 'no_overdue_tasks', label: 'No Overdue Tasks', max: 10, missingAction: 'Review and resolve overdue tasks' },
  { key: 'revenue', label: 'Revenue', max: 15, missingAction: 'Follow up on pending payment collection' },
  { key: 'ownership', label: 'Ownership', max: 15, missingAction: 'Complete ownership and split sheet documentation' },
];

const KPI_TOOLTIPS = {
  grossRevenue: {
    title: 'Gross Revenue',
    what: 'Total income earned across all artists from placements, sync fees, and other revenue sources.',
    why: 'Primary indicator of label revenue generation and artist commercial performance.',
    how: 'SUM of all revenue_events.amount across the portfolio.',
  },
  pipelineValue: {
    title: 'Pipeline Value',
    what: 'Weighted value of all active placements based on their probability of completion.',
    why: 'Forward-looking revenue indicator that helps forecast income and plan cash flow.',
    how: 'Pending placements * 25% + Confirmed * 60% + Completed * 100% of expected_value.',
  },
  payableNow: {
    title: 'Payable Now',
    what: 'Amount currently owed to artists who have fully recouped their expenses.',
    why: 'Critical for cash management and artist relationship health.',
    how: 'For each fully-recouped artist: amount_applied_to_recoupment - total_expenses.',
  },
  atRiskRevenue: {
    title: 'At-Risk Revenue',
    what: 'Revenue from pending placements that may not materialize.',
    why: 'Helps quantify downside exposure and prioritize follow-ups on uncertain deals.',
    how: 'SUM of expected_value * 25% for all placements with status = pending.',
  },
  totalArtists: {
    title: 'Total Artists',
    what: 'Number of active artists currently managed on the platform.',
    why: 'Roster size indicator reflecting label growth and capacity.',
    how: 'COUNT of artists where is_deleted = false.',
  },
  activeProjects: {
    title: 'Active Projects',
    what: 'Projects currently in progress across all artists.',
    why: 'Measures production throughput and team workload.',
    how: 'COUNT of projects where status = in_progress and is_deleted = false.',
  },
  totalAssets: {
    title: 'Total Assets',
    what: 'Total number of audio assets (beats, stems, mixes, masters, samples) in the catalog.',
    why: 'Catalog depth indicates licensing potential and production output.',
    how: 'COUNT of assets where is_deleted = false.',
  },
  pendingPlacements: {
    title: 'Pending Placements',
    what: 'Placement opportunities awaiting confirmation or completion.',
    why: 'Leading indicator of near-term revenue opportunities requiring follow-up.',
    how: 'COUNT of placements where status = pending and is_deleted = false.',
  },
};

function KpiTooltip({ kpiKey }) {
  const [show, setShow] = useState(false);
  const tip = KPI_TOOLTIPS[kpiKey];
  if (!tip) return null;

  return (
    <span
      style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          width: '280px',
          padding: '12px 14px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          zIndex: 100,
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'var(--color-text)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-primary)' }}>{tip.title}</div>
          <div style={{ marginBottom: '4px' }}><strong style={{ color: 'var(--color-text-secondary)' }}>What:</strong> {tip.what}</div>
          <div style={{ marginBottom: '4px' }}><strong style={{ color: 'var(--color-text-secondary)' }}>Why:</strong> {tip.why}</div>
          <div><strong style={{ color: 'var(--color-text-secondary)' }}>How:</strong> {tip.how}</div>
        </div>
      )}
    </span>
  );
}

function getScoreBarColor(value, max) {
  if (value === max) return 'var(--color-success)';
  if (value > 0) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function getActivityLink(item) {
  if (!item.entity_type || !item.entity_id) return null;
  switch (item.entity_type) {
    case 'artist': return `/artists/${item.entity_id}`;
    case 'project': return `/projects/${item.entity_id}`;
    case 'asset': return `/port/assets/${item.entity_id}`;
    case 'placement': return '/port/placements';
    default: return null;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'viewer';
  const isElevated = role === 'admin' || role === 'owner' || role === 'manager';

  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [momentum, setMomentum] = useState([]);
  const [nextActions, setNextActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedArtist, setSelectedArtist] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [sum, act, tsk, health, mom, actions] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/recent-activity').catch(() => []),
          api.get('/tasks?status=open&limit=5').catch(() => []),
          api.get('/panel/health').catch(() => []),
          api.get('/panel/momentum').catch(() => []),
          api.get('/panel/actions').catch(() => []),
        ]);
        setSummary(sum);
        setActivity(Array.isArray(act) ? act : []);
        setTasks(Array.isArray(tsk) ? tsk : []);
        setHealthScores(Array.isArray(health) ? health : []);
        setMomentum(Array.isArray(mom) ? mom : []);
        setNextActions(Array.isArray(actions) ? actions : []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error && !summary) return <div className="empty-state">{error}</div>;

  const totalArtists = summary?.artists?.total || 0;
  const totalAssets = summary?.assets?.total || 0;
  const kpi = summary?.kpiSnapshot || {};

  const projectStatusArr = objToArray(summary?.projects?.byStatus);
  const artistStatusArr = objToArray(summary?.artists?.byStatus);
  const placementStatusObj = summary?.placements?.byStatus || {};

  const activeProjects = summary?.projects?.byStatus?.in_progress || 0;
  const pendingPlacements = placementStatusObj.pending || 0;

  const subscriptionData = (summary?.subscriptionDistribution || []).map((s) => ({
    name: s.tier_name || 'Unknown',
    value: s.subscriber_count || 0,
  }));

  const chartTooltip = {
    backgroundColor: '#1a1d27',
    borderColor: '#2d3143',
    textStyle: { color: '#e4e6ef' },
  };

  /* ── Projects by Status bar chart ────────────────────────────────── */
  const projectBarOption = projectStatusArr.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: projectStatusArr.map((d) => d.name),
      axisLabel: { color: '#8890a8', fontSize: 12 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#8890a8', fontSize: 12 },
      splitLine: { lineStyle: { color: '#2d3143' } },
    },
    series: [{
      type: 'bar',
      data: projectStatusArr.map((d, i) => ({
        value: d.value,
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  } : null;

  /* ── Placement Pipeline bar chart ──────────────────────────────── */
  const placementStatusArr = objToArray(placementStatusObj);
  const placementBarOption = placementStatusArr.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: placementStatusArr.map((d) => d.name),
      axisLabel: { color: '#8890a8', fontSize: 12 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#8890a8', fontSize: 12 },
      splitLine: { lineStyle: { color: '#2d3143' } },
    },
    series: [{
      type: 'bar',
      data: placementStatusArr.map((d, i) => ({
        value: d.value,
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  } : null;

  /* ── Recoup horizontal bar chart (FIX: was stacked single-category) ── */
  const recoupData = [
    { name: 'Recouped', value: parseFloat(kpi.recoupedAmount) || 0, color: '#22c55e' },
    { name: 'Unrecouped', value: parseFloat(kpi.unrecoupedBalance) || 0, color: '#ef4444' },
    { name: 'Payable', value: parseFloat(kpi.payableNow) || 0, color: '#3b82f6' },
  ];
  const hasRecoupData = recoupData.some((d) => d.value > 0);
  const recoupOption = isElevated && hasRecoupData ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      ...chartTooltip,
      formatter: (params) => params.map((p) => `${p.name}: ${formatCurrency(p.value)}`).join('<br/>'),
    },
    grid: { left: 100, right: 40, top: 10, bottom: 10, containLabel: false },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#8890a8', formatter: (v) => `$${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: {
      type: 'category',
      data: recoupData.map((d) => d.name),
      axisLabel: { color: '#8890a8', fontSize: 13 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    series: [{
      type: 'bar',
      data: recoupData.map((d) => ({ value: d.value, itemStyle: { color: d.color } })),
      barWidth: '50%',
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        formatter: (p) => formatCurrency(p.value),
        color: '#e4e6ef',
        fontSize: 12,
      },
    }],
  } : null;

  /* ── Project Throughput line chart ──────────────────────────────── */
  const throughputData = summary?.projectThroughput || [];
  const throughputOption = throughputData.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: throughputData.map((d) => d.month),
      axisLabel: { color: '#8890a8', fontSize: 11, rotate: 45 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#8890a8', fontSize: 12 },
      splitLine: { lineStyle: { color: '#2d3143' } },
    },
    series: [{
      type: 'line',
      data: throughputData.map((d) => d.count),
      smooth: true,
      lineStyle: { color: '#6c63ff', width: 2 },
      itemStyle: { color: '#6c63ff' },
      areaStyle: { color: 'rgba(108, 99, 255, 0.1)' },
    }],
  } : null;

  /* ── Artist Status pie chart ───────────────────────────────────── */
  const artistPieOption = artistStatusArr.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...chartTooltip },
    legend: { bottom: 0, textStyle: { color: '#8890a8', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#12141c', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#e4e6ef' } },
      data: artistStatusArr.map((d, i) => ({ ...d, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })),
    }],
  } : null;

  /* ── Subscription Distribution pie chart ───────────────────────── */
  const subscriptionPieOption = subscriptionData.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...chartTooltip },
    legend: { bottom: 0, textStyle: { color: '#8890a8', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#12141c', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#e4e6ef' } },
      data: subscriptionData.map((d, i) => ({ ...d, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })),
    }],
  } : null;

  /* ── Momentum chart option ─────────────────────────────────────── */
  const momentumOption = momentum.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    legend: { bottom: 0, textStyle: { color: '#8890a8', fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: '40px', top: '10px', containLabel: true },
    xAxis: {
      type: 'category',
      data: momentum.map((d) => d.month),
      axisLabel: { color: '#8890a8', fontSize: 11, rotate: 30 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: [
      { type: 'value', name: 'Count', axisLabel: { color: '#8890a8', fontSize: 11 }, splitLine: { lineStyle: { color: '#2d3143' } } },
      { type: 'value', name: 'Revenue', axisLabel: { color: '#8890a8', fontSize: 11, formatter: (v) => `$${(v / 1000).toFixed(0)}k` }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Assets', type: 'bar', data: momentum.map((d) => d.new_assets || 0), itemStyle: { color: '#6c63ff' }, barWidth: '20%' },
      { name: 'Placements', type: 'bar', data: momentum.map((d) => d.new_placements || 0), itemStyle: { color: '#3b82f6' }, barWidth: '20%' },
      { name: 'Projects', type: 'bar', data: momentum.map((d) => d.new_projects || 0), itemStyle: { color: '#22c55e' }, barWidth: '20%' },
      { name: 'Revenue', type: 'line', yAxisIndex: 1, data: momentum.map((d) => d.revenue || 0), smooth: true, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
    ],
  } : null;

  /* ── Momentum bar click handler ────────────────────────────────── */
  const onMomentumClick = (_params) => {
    // Placeholder for future momentum chart drill-down navigation
  };

  /* ── Health score drilldown helpers ────────────────────────────── */
  const renderHealthDrilldown = () => {
    if (!selectedArtist) return null;
    const breakdown = selectedArtist.breakdown || {};
    const scoreColor = selectedArtist.health_score >= 70 ? 'var(--color-success)' : selectedArtist.health_score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
    const scoreLabel = selectedArtist.health_score >= 70 ? 'Healthy' : selectedArtist.health_score >= 40 ? 'Needs Attention' : 'At Risk';

    const drivers = [];
    const risks = [];
    const actions = [];

    HEALTH_DIMENSIONS.forEach((dim) => {
      const val = breakdown[dim.key] || 0;
      if (val === dim.max) {
        drivers.push(dim.label + ': Full score (' + val + '/' + dim.max + ')');
      } else if (val > 0) {
        risks.push(dim.label + ': Partial score (' + val + '/' + dim.max + ')');
        actions.push(dim.missingAction);
      } else {
        risks.push(dim.label + ': No score (0/' + dim.max + ')');
        actions.push(dim.missingAction);
      }
    });

    return (
      <div className="modal-overlay" onClick={() => setSelectedArtist(null)}>
        <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h3 style={{ marginBottom: '4px' }}>
                {selectedArtist.stage_name || selectedArtist.name}
              </h3>
              {selectedArtist.stage_name && selectedArtist.name !== selectedArtist.stage_name && (
                <div className="text-sm text-secondary">{selectedArtist.name}</div>
              )}
              {selectedArtist.genre && (
                <div className="text-xs text-muted" style={{ marginTop: '4px' }}>{selectedArtist.genre}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: scoreColor }}>
                {selectedArtist.health_score}
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--color-text-muted)' }}> / 100</span>
              </div>
              <div className="text-sm" style={{ color: scoreColor }}>{scoreLabel}</div>
            </div>
          </div>

          {/* Score Breakdown Bars */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '12px' }}>
              Score Breakdown
            </div>
            {HEALTH_DIMENSIONS.map((dim) => {
              const val = breakdown[dim.key] || 0;
              const pct = dim.max > 0 ? (val / dim.max) * 100 : 0;
              const barColor = getScoreBarColor(val, dim.max);
              return (
                <div key={dim.key} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{dim.label}</span>
                    <span className="text-sm font-semibold" style={{ color: barColor }}>
                      {val} / {dim.max}
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'var(--color-surface-2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: barColor,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Score Drivers */}
          {drivers.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)', marginBottom: '8px' }}>
                Score Drivers
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
                {drivers.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {/* Risk Factors */}
          {risks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '8px' }}>
                Risk Factors
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
                {risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {actions.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '8px' }}>
                Recommended Actions
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
                {actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setSelectedArtist(null)}>
              Close
            </button>
            <Link
              to={`/artists/${selectedArtist.id}`}
              className="btn btn-primary"
              onClick={() => setSelectedArtist(null)}
            >
              View Artist
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        {role === 'viewer' && <span className="badge badge--active">View Only</span>}
      </div>

      {/* Summary Cards -- clickable to relevant pages */}
      <div className="summary-cards">
        <Link to="/artists" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="summary-card" style={{ cursor: 'pointer' }}>
            <div className="summary-card__label">Total Artists<KpiTooltip kpiKey="totalArtists" /></div>
            <div className="summary-card__value">{totalArtists}</div>
          </div>
        </Link>
        <Link to="/projects" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="summary-card" style={{ cursor: 'pointer' }}>
            <div className="summary-card__label">Active Projects<KpiTooltip kpiKey="activeProjects" /></div>
            <div className="summary-card__value">{activeProjects}</div>
          </div>
        </Link>
        <Link to="/port/assets" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="summary-card" style={{ cursor: 'pointer' }}>
            <div className="summary-card__label">Total Assets<KpiTooltip kpiKey="totalAssets" /></div>
            <div className="summary-card__value">{totalAssets}</div>
          </div>
        </Link>
        <Link to="/port/placements" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="summary-card" style={{ cursor: 'pointer' }}>
            <div className="summary-card__label">Pending Placements<KpiTooltip kpiKey="pendingPlacements" /></div>
            <div className="summary-card__value">{pendingPlacements}</div>
          </div>
        </Link>
      </div>

      {/* KPI Cards -- manager/admin */}
      {isElevated && (
        <div className="summary-cards mt-16">
          <div className="summary-card">
            <div className="summary-card__label">Gross Revenue<KpiTooltip kpiKey="grossRevenue" /></div>
            <div className="summary-card__value">{formatCurrency(kpi.grossRevenue)}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>High confidence</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__label">Pipeline Value<KpiTooltip kpiKey="pipelineValue" /></div>
            <div className="summary-card__value">{formatCurrency(kpi.pipelineValue)}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px' }}>Medium confidence</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__label">Payable Now<KpiTooltip kpiKey="payableNow" /></div>
            <div className="summary-card__value" style={{ color: kpi.payableNow > 0 ? '#22c55e' : 'inherit' }}>
              {formatCurrency(kpi.payableNow)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>High confidence</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__label">At-Risk<KpiTooltip kpiKey="atRiskRevenue" /></div>
            <div className="summary-card__value" style={{ color: kpi.atRiskRevenue > 0 ? '#ef4444' : 'inherit' }}>
              {formatCurrency(kpi.atRiskRevenue)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px' }}>Low confidence</div>
          </div>
        </div>
      )}

      {/* Quick Views */}
      {isElevated && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '32px' }}>Quick Views:</span>
          <button className="btn btn-secondary btn-sm" onClick={() => {/* scroll to health scores, filter at-risk */}}>
            At-Risk Artists
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/business')}>
            Unrecouped Exposure
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/port/assets')}>
            Metadata Gaps
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>
            Revenue Trends
          </button>
        </div>
      )}

      {isElevated && <InsightsPanel kpi={kpi} healthScores={healthScores} />}

      {/* ROI Projections */}
      {isElevated && kpi && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--color-success)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Expected 30-Day Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency((parseFloat(kpi.pipelineValue) || 0) * 0.35)}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Based on pipeline conversion rate</div>
          </div>
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Expected 60-Day Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency((parseFloat(kpi.pipelineValue) || 0) * 0.55)}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Includes confirmed placements</div>
          </div>
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--color-info)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Expected 90-Day Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{formatCurrency((parseFloat(kpi.pipelineValue) || 0) * 0.75)}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Full pipeline projection</div>
          </div>
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', borderLeft: '4px solid var(--color-danger)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Bottleneck Alert</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{parseInt(kpi.pendingPlacements) > 5 ? `${kpi.pendingPlacements} stalled placements` : 'No bottlenecks detected'}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Pending &gt; 10 days flagged</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="dashboard-chart-grid">
        <div className="card">
          <h3>Projects by Status</h3>
          {projectBarOption ? (
            <ReactECharts option={projectBarOption} style={{ height: 260, minHeight: 200 }} />
          ) : (
            <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
          )}
        </div>

        {isElevated && (
          <div className="card">
            <h3>Placement Pipeline</h3>
            {placementBarOption ? (
              <ReactECharts option={placementBarOption} style={{ height: 260, minHeight: 200 }} />
            ) : (
              <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
            )}
          </div>
        )}

        {!isElevated && (
          <div className="card">
            <h3>Artists by Status</h3>
            {artistPieOption ? (
              <ReactECharts option={artistPieOption} style={{ height: 260, minHeight: 200 }} />
            ) : (
              <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
            )}
          </div>
        )}

        <div className="card">
          <h3>Subscription Distribution</h3>
          {subscriptionPieOption ? (
            <ReactECharts option={subscriptionPieOption} style={{ height: 260, minHeight: 200 }} />
          ) : (
            <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
          )}
        </div>
      </div>

      {/* Admin/Manager extra charts */}
      {isElevated && (
        <div className="chart-grid mt-24 mb-24">
          <div className="card">
            <h3>Recouped vs Unrecouped vs Payable</h3>
            {recoupOption ? (
              <ReactECharts option={recoupOption} style={{ height: 280, minHeight: 200 }} />
            ) : (
              <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
            )}
          </div>

          <div className="card">
            <h3>Project Throughput (Monthly)</h3>
            {throughputOption ? (
              <ReactECharts option={throughputOption} style={{ height: 280, minHeight: 200 }} />
            ) : (
              <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
            )}
          </div>
        </div>
      )}

      {/* Activity Feed + Tasks */}
      <div className="dashboard-bottom-grid">
        <div className="detail-section">
          <h3>Recent Activity</h3>
          {activity.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 24px' }}>No recent activity</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Summary</th>
                    <th>When</th>
                    <th>Reactions</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((item) => {
                    const activityLink = getActivityLink(item);
                    return (
                      <tr
                        key={item.id}
                        style={{ cursor: activityLink ? 'pointer' : 'default' }}
                        onClick={() => activityLink && navigate(activityLink)}
                      >
                        <td>
                          <span className="badge badge--active">{capitalize(item.event_type || '')}</span>
                        </td>
                        <td>{item.summary}</td>
                        <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '--'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' }}>
                            {item.reactions && Array.isArray(item.reactions) && item.reactions.length > 0 && (
                              <span className="text-xs text-muted">
                                {item.reactions.length} reaction{item.reactions.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {item.comment_count > 0 && (
                              <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }}>{item.comment_count} replies</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3>Next Actions</h3>
          {tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 24px' }}>No open tasks</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('/tasks')}
                    >
                      <td>{task.title}</td>
                      <td>
                        <span className={`badge badge--${task.priority || 'medium'}`}>
                          {capitalize(task.priority || 'medium')}
                        </span>
                      </td>
                      <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-16 text-right">
            <Link to="/tasks" className="btn btn-secondary btn-sm">View All Tasks</Link>
          </div>
        </div>
      </div>

      {/* Health Scores + Momentum */}
      {isElevated && (
        <div className="dashboard-bottom-grid">
          <div className="detail-section">
            <h3>Artist Health Scores</h3>
            {healthScores.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 24px' }}>No health data available</div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Genre</th>
                      <th>Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthScores.slice(0, 15).map((h) => {
                      const scoreColor = h.health_score >= 70 ? 'var(--color-success)' : h.health_score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';
                      const scoreLabel = h.health_score >= 70 ? 'Healthy' : h.health_score >= 40 ? 'Needs Attention' : 'At Risk';
                      return (
                        <tr
                          key={h.id || h.artist_id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedArtist(h)}
                        >
                          <td>
                            <div className="font-semibold">{h.stage_name || h.name}</div>
                            {h.stage_name && h.name !== h.stage_name && <div className="text-xs text-muted">{h.name}</div>}
                          </td>
                          <td className="text-sm">{h.genre || '--'}</td>
                          <td>
                            <span className="font-semibold" style={{ color: scoreColor }}>{h.health_score}</span>
                            <span className="text-xs text-muted"> / 100</span>
                          </td>
                          <td><span className="text-xs" style={{ color: scoreColor }}>{scoreLabel}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Momentum Trends</h3>
            {momentumOption ? (
              <ReactECharts
                style={{ height: 300, minHeight: 200 }}
                option={momentumOption}
                onEvents={{ click: onMomentumClick }}
              />
            ) : (
              <div className="empty-state" style={{ padding: '40px 24px' }}>No data yet</div>
            )}
          </div>
        </div>
      )}

      {/* Next Actions from Panel */}
      {isElevated && nextActions.length > 0 && (
        <div className="detail-section">
          <h3>Priority Actions</h3>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {nextActions.slice(0, 10).map((action, i) => (
                  <tr key={i}>
                    <td><span className={`badge badge--${action.priority}`}>{capitalize(action.priority)}</span></td>
                    <td><span className="badge badge--active">{capitalize(action.type)}</span></td>
                    <td className="font-semibold">{action.title}</td>
                    <td className="text-sm text-secondary">{action.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Advanced Analytics</h3>
        <p className="text-sm text-secondary" style={{ lineHeight: '1.6' }}>
          Apache Superset integration is available for advanced analytics, custom dashboards,
          and deep data exploration. See <code>docs/architecture.md</code> for setup instructions.
        </p>
      </div>

      {/* Health Score Drilldown Modal */}
      {renderHealthDrilldown()}
    </div>
  );
}
