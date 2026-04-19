import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';
import { formatCurrency, capitalize } from '../utils/formatters';

const COLORS = ['#0066FF', '#6A00FF', '#00FF84', '#FFB000', '#E10600', '#00BFFF', '#FF6B6B'];
const chartTooltip = {
  backgroundColor: '#1C2228',
  borderColor: 'rgba(255,255,255,0.07)',
  textStyle: { color: '#F4F4F2', fontSize: 12 },
};

export default function DeepAnalyticsPage() {
  const [coverage, setCoverage] = useState(null);
  const [insights, setInsights] = useState(null);
  const [health, setHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [cov, ins, hlth] = await Promise.all([
          api.get('/port/analytics/coverage').catch(() => null),
          api.get('/port/analytics/insights').catch(() => null),
          api.get('/panel/health').catch(() => null),
        ]);
        setCoverage(cov);
        setInsights(ins);
        setHealth(hlth);
      } catch (err) {
        setError('Failed to load advanced analytics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading advanced analytics...</div>;
  if (error && !insights) return <div className="empty-state">{error}</div>;

  const tabs = [
    { key: 'overview', label: 'Cross-Module' },
    { key: 'coverage', label: 'Metadata Coverage' },
    { key: 'health', label: 'Health Radar' },
    { key: 'funnel', label: 'Pipeline Funnel' },
  ];

  const wf = insights?.waterfall || {};
  const funnel = insights?.funnel || [];
  const monthlyComp = insights?.monthly_comparison || [];
  const tierRev = insights?.tier_revenue || [];
  const conflicts = insights?.ownership_conflicts || [];
  const covArtists = coverage?.artists || [];
  const covSummary = coverage?.summary || {};
  const healthScores = (Array.isArray(health) ? health : health?.artists || []).slice(0, 10);

  // Waterfall chart option
  const waterfallOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip, formatter: (p) => p.map((s) => `${s.seriesName}: ${formatCurrency(Math.abs(s.value))}`).join('<br/>') },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Gross Revenue', 'Expenses', 'Applied to Recoup', 'Net Payable'],
      axisLabel: { color: '#5f6780', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#5f6780', formatter: (v) => `$${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    series: [{
      name: 'Amount',
      type: 'bar',
      data: [
        { value: wf.gross_revenue || 0, itemStyle: { color: '#22c55e' } },
        { value: -(wf.total_expenses || 0), itemStyle: { color: '#ef4444' } },
        { value: wf.applied_to_recoupment || 0, itemStyle: { color: '#FFB000' } },
        { value: wf.net_payable || 0, itemStyle: { color: '#0066FF' } },
      ],
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  };

  // Monthly revenue vs expenses
  const monthlyOption = monthlyComp.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip, formatter: (p) => p.map((s) => `${s.seriesName}: ${formatCurrency(s.value)}`).join('<br/>') },
    legend: { data: ['Revenue', 'Expenses'], textStyle: { color: '#5f6780' }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: monthlyComp.map((d) => d.month),
      axisLabel: { color: '#5f6780', fontSize: 11, rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#5f6780', formatter: (v) => `$${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    series: [
      {
        name: 'Revenue', type: 'line', smooth: true,
        data: monthlyComp.map((d) => d.revenue),
        lineStyle: { color: '#22c55e', width: 2 },
        itemStyle: { color: '#22c55e' },
        areaStyle: { color: 'rgba(34, 197, 94, 0.08)' },
      },
      {
        name: 'Expenses', type: 'line', smooth: true,
        data: monthlyComp.map((d) => d.expenses),
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        areaStyle: { color: 'rgba(239, 68, 68, 0.08)' },
      },
    ],
  } : null;

  // Tier revenue bar chart
  const tierOption = tierRev.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    legend: { data: ['Total Revenue', 'Avg per Artist'], textStyle: { color: '#5f6780' }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: tierRev.map((t) => t.tier_name),
      axisLabel: { color: '#5f6780', fontSize: 12 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#5f6780', formatter: (v) => `$${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    series: [
      {
        name: 'Total Revenue', type: 'bar',
        data: tierRev.map((t) => t.total_revenue),
        itemStyle: { color: '#0066FF', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: 'Avg per Artist', type: 'bar',
        data: tierRev.map((t) => t.avg_revenue),
        itemStyle: { color: '#6A00FF', borderRadius: [4, 4, 0, 0] },
      },
    ],
  } : null;

  // Funnel chart
  const funnelOption = funnel.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...chartTooltip, formatter: (p) => `${capitalize(p.name)}<br/>Count: ${p.data.rawCount}<br/>Value: ${formatCurrency(p.data.rawValue)}` },
    series: [{
      type: 'funnel',
      left: '10%', right: '10%', top: '10%', bottom: '10%',
      width: '80%',
      sort: 'none',
      gap: 4,
      label: { show: true, position: 'inside', formatter: (p) => `${capitalize(p.name)}\n${p.data.rawCount}`, color: '#fff', fontSize: 13 },
      itemStyle: { borderWidth: 0 },
      data: funnel.map((f, i) => ({
        name: f.status,
        value: funnel.length - i,
        rawCount: f.count,
        rawValue: f.value,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    }],
  } : null;

  // Coverage heatmap fields
  const coverageFields = ['isrc_pct', 'iswc_pct', 'genre_pct', 'bpm_pct', 'key_pct', 'duration_pct'];
  const coverageLabels = ['ISRC', 'ISWC', 'Genre', 'BPM', 'Key', 'Duration'];

  const getCoverageColor = (pct) => {
    if (pct >= 80) return '#22c55e';
    if (pct >= 50) return '#FFB000';
    if (pct >= 25) return '#f97316';
    return '#ef4444';
  };

  // Health radar option builder
  const buildRadarOption = (artist) => {
    const dims = artist.dimensions || {};
    const indicators = [
      { name: 'Revenue', max: 100 },
      { name: 'Metadata', max: 100 },
      { name: 'Catalog', max: 100 },
      { name: 'Engagement', max: 100 },
      { name: 'Pipeline', max: 100 },
      { name: 'Compliance', max: 100 },
    ];
    const values = [
      dims.revenue_score || 0,
      dims.metadata_score || 0,
      dims.catalog_score || 0,
      dims.engagement_score || 0,
      dims.pipeline_score || 0,
      dims.compliance_score || 0,
    ];
    return {
      backgroundColor: 'transparent',
      tooltip: { ...chartTooltip },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        axisName: { color: '#5f6780', fontSize: 11 },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
      },
      series: [{
        type: 'radar',
        data: [{
          value: values,
          name: artist.stage_name || artist.artist_name,
          areaStyle: { color: 'rgba(0, 102, 255, 0.15)' },
          lineStyle: { color: '#0066FF', width: 2 },
          itemStyle: { color: '#0066FF' },
        }],
      }],
    };
  };

  return (
    <div>
      <div className="page-header">
        <h2>Deep Analytics</h2>
        <span className="badge badge--active">Advanced Insights</span>
      </div>

      {/* Summary KPI row */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card__label">Gross Revenue</div>
          <div className="summary-card__value text-success">{formatCurrency(wf.gross_revenue || 0)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Total Expenses</div>
          <div className="summary-card__value text-danger">{formatCurrency(wf.total_expenses || 0)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Net Payable</div>
          <div className="summary-card__value text-primary">{formatCurrency(wf.net_payable || 0)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Metadata Coverage</div>
          <div className="summary-card__value" style={{ color: (covSummary.avg_coverage_pct || 0) >= 70 ? '#22c55e' : '#FFB000' }}>
            {covSummary.avg_coverage_pct || 0}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mt-24">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab${activeTab === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cross-Module Tab */}
      {activeTab === 'overview' && (
        <div className="mt-16">
          <div className="chart-grid">
            <div className="card">
              <h3>Revenue Waterfall</h3>
              <ReactECharts option={waterfallOption} style={{ height: 320 }} />
            </div>
            {monthlyOption && (
              <div className="card">
                <h3>Revenue vs Expenses (12 Months)</h3>
                <ReactECharts option={monthlyOption} style={{ height: 320 }} />
              </div>
            )}
          </div>

          {tierOption && (
            <div className="card mt-16">
              <h3>Subscription Tier Performance</h3>
              <p className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                Revenue generated per subscription tier, showing total and per-artist averages.
              </p>
              <ReactECharts option={tierOption} style={{ height: 320 }} />
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="detail-section mt-16">
              <h3 style={{ color: '#ef4444' }}>Ownership Conflicts Detected</h3>
              <p className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                Assets where total ownership percentage exceeds 100%.
              </p>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Asset</th><th>Owners</th><th>Total %</th><th>Over By</th></tr>
                  </thead>
                  <tbody>
                    {conflicts.map((c, i) => (
                      <tr key={i} className="clickable-row" onClick={() => window.location.pathname = `/port/assets/${c.asset_id}`}>
                        <td className="font-semibold">{c.asset_title}</td>
                        <td>{c.owner_count}</td>
                        <td style={{ color: '#ef4444' }}>{c.total_pct}%</td>
                        <td style={{ color: '#ef4444' }}>+{(c.total_pct - 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata Coverage Tab */}
      {activeTab === 'coverage' && (
        <div className="mt-16">
          <div className="summary-cards">
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{covSummary.total_artists || 0}</div>
              <div className="summary-card__label">Artists with Assets</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-secondary">{covSummary.total_assets || 0}</div>
              <div className="summary-card__label">Total Assets Tracked</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value" style={{ color: (covSummary.avg_coverage_pct || 0) >= 70 ? '#22c55e' : '#FFB000' }}>
                {covSummary.avg_coverage_pct || 0}%
              </div>
              <div className="summary-card__label">Avg. Coverage Score</div>
            </div>
          </div>

          {covArtists.length > 0 ? (
            <div className="detail-section mt-16">
              <h3>Metadata Coverage Matrix</h3>
              <p className="text-xs text-muted" style={{ marginBottom: '12px' }}>
                Percentage of assets per artist with each metadata field populated.
                <span style={{ marginLeft: '12px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#22c55e', marginRight: '4px' }}></span>80%+
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#FFB000', marginLeft: '8px', marginRight: '4px' }}></span>50-79%
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#f97316', marginLeft: '8px', marginRight: '4px' }}></span>25-49%
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444', marginLeft: '8px', marginRight: '4px' }}></span>&lt;25%
                </span>
              </p>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Assets</th>
                      {coverageLabels.map((l) => <th key={l} style={{ textAlign: 'center' }}>{l}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {covArtists.map((a, i) => (
                      <tr key={i} className="clickable-row" onClick={() => window.location.pathname = `/artists/${a.artist_id}`}>
                        <td className="font-semibold">{a.stage_name || a.artist_name}</td>
                        <td>{a.total_assets}</td>
                        {coverageFields.map((f) => (
                          <td key={f} style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fff',
                              background: getCoverageColor(a[f]),
                              minWidth: '42px',
                            }}>
                              {a[f]}%
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state mt-16">No asset data available for coverage analysis</div>
          )}
        </div>
      )}

      {/* Health Radar Tab */}
      {activeTab === 'health' && (
        <div className="mt-16">
          {healthScores.length > 0 ? (
            <>
              <p className="text-sm text-secondary" style={{ marginBottom: '16px' }}>
                Six-dimensional health radar for each artist: Revenue momentum, Metadata completeness,
                Catalog depth, Audience engagement, Pipeline activity, and Compliance readiness.
              </p>
              <div className="chart-grid">
                {healthScores.map((artist, i) => (
                  <div key={i} className="card" style={{ cursor: 'pointer' }} onClick={() => window.location.pathname = `/artists/${artist.artist_id}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px' }}>{artist.stage_name || artist.artist_name}</h3>
                      <span className="badge" style={{
                        background: artist.overall_score >= 70 ? 'rgba(34,197,94,0.15)' : artist.overall_score >= 40 ? 'rgba(255,176,0,0.15)' : 'rgba(239,68,68,0.15)',
                        color: artist.overall_score >= 70 ? '#22c55e' : artist.overall_score >= 40 ? '#FFB000' : '#ef4444',
                      }}>
                        {Math.round(artist.overall_score)}/100
                      </span>
                    </div>
                    <ReactECharts option={buildRadarOption(artist)} style={{ height: 240 }} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No health score data available</div>
          )}
        </div>
      )}

      {/* Pipeline Funnel Tab */}
      {activeTab === 'funnel' && (
        <div className="mt-16">
          <div className="chart-grid">
            {funnelOption ? (
              <div className="card">
                <h3>Placement Pipeline Funnel</h3>
                <p className="text-xs text-muted" style={{ marginBottom: '8px' }}>
                  Visualizes how placements flow from pending through confirmed to completed.
                </p>
                <ReactECharts option={funnelOption} style={{ height: 380 }} />
              </div>
            ) : (
              <div className="empty-state">No placement data available</div>
            )}
            <div className="card">
              <h3>Pipeline Breakdown</h3>
              {funnel.length > 0 ? (
                <div style={{ padding: '16px 0' }}>
                  {funnel.map((f, i) => {
                    const maxCount = Math.max(...funnel.map((x) => x.count), 1);
                    const pct = Math.round((f.count / maxCount) * 100);
                    return (
                      <div key={i} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className="font-semibold text-sm">{capitalize(f.status)}</span>
                          <span className="text-sm text-muted">{f.count} placements &middot; {formatCurrency(f.value)}</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{
                            height: '100%',
                            borderRadius: '4px',
                            width: `${pct}%`,
                            background: COLORS[i % COLORS.length],
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">No pipeline data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="detail-section mt-24">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/analytics" className="btn btn-secondary btn-sm">Back to Analytics</Link>
          <Link to="/business" className="btn btn-secondary btn-sm">Business Ops</Link>
          <Link to="/" className="btn btn-secondary btn-sm">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
