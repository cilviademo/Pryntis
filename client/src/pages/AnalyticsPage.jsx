import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';
import { capitalize, objToArray, formatCurrency } from '../utils/formatters';
import ExportButton from '../components/ExportButton';

const COLORS = ['#7C3AED', '#4ECDC4', '#34D399', '#FBBF24', '#EF4444', '#7C3AED', '#34D399'];

const chartTooltip = {
  backgroundColor: '#1a1a2a',
  borderColor: 'rgba(255,255,255,0.07)',
  textStyle: { color: '#F0EDE8', fontSize: 12 },
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [portAnalytics, setPortAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [data, placements, assets, revenue, deliveries] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/port/analytics/placements').catch(() => null),
          api.get('/port/analytics/assets').catch(() => null),
          api.get('/port/analytics/revenue').catch(() => null),
          api.get('/port/analytics/deliveries').catch(() => null),
        ]);
        setSummary(data);
        setPortAnalytics({ placements, assets, revenue, deliveries });
      } catch (err) {
        setError('Failed to load analytics data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (error && !summary) return <div className="empty-state">{error}</div>;
  if (!summary) return <div className="empty-state">No analytics data available</div>;

  const kpi = summary.kpiSnapshot || {};
  const grossRevenue = kpi.grossRevenue || 0;
  const recoupableBalance = kpi.recoupableBalance || 0;
  const pipelineValue = kpi.pipelineValue || 0;
  const atRiskRevenue = kpi.atRiskRevenue || 0;

  const totalArtists = summary.artists?.total || 0;
  const totalProjects = summary.projects?.total || 0;
  const totalAssets = summary.assets?.total || 0;

  const projectStatusData = objToArray(summary.projects?.byStatus);
  const artistStatusData = objToArray(summary.artists?.byStatus);
  const placementStatusData = objToArray(summary.placements?.byStatus);

  const makePieOption = (data) => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...chartTooltip },
    legend: { bottom: 0, textStyle: { color: '#5c5e78', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#151820', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#e8eaf0' } },
      data: data.map((d, i) => ({ ...d, itemStyle: { color: COLORS[i % COLORS.length] } })),
    }],
  });

  const makeBarOption = (data) => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLabel: { color: '#5c5e78', fontSize: 12 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
      axisTick: { show: false },
    },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } }, axisLabel: { color: '#5c5e78', fontSize: 12 } },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({ value: d.value, itemStyle: { color: COLORS[i % COLORS.length] } })),
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  });

  const subscriptionData = (summary.subscriptionDistribution || []).map((s) => ({
    name: s.tier_name || 'Unknown',
    value: s.subscriber_count || 0,
  }));

  // Port analytics data
  const pa = portAnalytics || {};
  const placementsByType = pa.placements?.by_type ? objToArray(
    (Array.isArray(pa.placements.by_type) ? pa.placements.by_type : []).reduce(
      (acc, r) => { acc[r.placement_type || r.type] = r.count; return acc; }, {}
    )
  ) : [];
  const assetsByType = pa.assets?.by_file_type ? objToArray(
    (Array.isArray(pa.assets.by_file_type) ? pa.assets.by_file_type : []).reduce(
      (acc, r) => { acc[r.file_type || r.type] = r.count; return acc; }, {}
    )
  ) : [];
  const assetsByGenre = pa.assets?.by_genre ? objToArray(
    (Array.isArray(pa.assets.by_genre) ? pa.assets.by_genre : []).reduce(
      (acc, r) => { acc[r.genre] = r.count; return acc; }, {}
    )
  ) : [];
  const monthlyRevenue = pa.revenue?.monthly || [];
  const topEarners = pa.revenue?.top_artists || [];
  const deliveries = pa.deliveries || {};

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'placements', label: 'Placements' },
    { key: 'assets', label: 'Assets' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'delivery', label: 'Delivery' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Analytics</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ExportButton entity="artists" />
        </div>
      </div>

      <div className="summary-cards">
        <Link to="/artists" className="summary-card">
          <div className="summary-card__label">Total Artists</div>
          <div className="summary-card__value">{totalArtists}</div>
        </Link>
        <Link to="/projects" className="summary-card">
          <div className="summary-card__label">Total Projects</div>
          <div className="summary-card__value">{totalProjects}</div>
        </Link>
        <Link to="/port/assets" className="summary-card">
          <div className="summary-card__label">Total Assets</div>
          <div className="summary-card__value">{totalAssets}</div>
        </Link>
        <Link to="/business" className="summary-card">
          <div className="summary-card__label">Gross Revenue</div>
          <div className="summary-card__value">{formatCurrency(grossRevenue)}</div>
        </Link>
      </div>

      <div className="summary-cards mt-16">
        <div className="summary-card">
          <div className="summary-card__label">Pipeline Value</div>
          <div className="summary-card__value">{formatCurrency(pipelineValue)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Recoupable Balance</div>
          <div className="summary-card__value">{formatCurrency(recoupableBalance)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">At-Risk Revenue</div>
          <div className="summary-card__value" style={{ color: atRiskRevenue > 0 ? '#ef4444' : 'inherit' }}>
            {formatCurrency(atRiskRevenue)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Recouped</div>
          <div className="summary-card__value">{kpi.recouped ? 'Yes' : 'No'}</div>
        </div>
      </div>

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

      {activeTab === 'overview' && (
        <div className="chart-grid mt-16">
          <div className="card">
            <h3>Projects by Status</h3>
            {projectStatusData.length > 0 ? <ReactECharts option={makeBarOption(projectStatusData)} style={{ height: 300 }} /> : <div className="empty-state">No project data</div>}
          </div>
          <div className="card">
            <h3>Artists by Status</h3>
            {artistStatusData.length > 0 ? <ReactECharts option={makePieOption(artistStatusData)} style={{ height: 300 }} /> : <div className="empty-state">No artist data</div>}
          </div>
          <div className="card">
            <h3>Placements by Status</h3>
            {placementStatusData.length > 0 ? <ReactECharts option={makeBarOption(placementStatusData)} style={{ height: 300 }} /> : <div className="empty-state">No placement data</div>}
          </div>
          <div className="card">
            <h3>Subscription Distribution</h3>
            {subscriptionData.length > 0 ? <ReactECharts option={makePieOption(subscriptionData)} style={{ height: 300 }} /> : <div className="empty-state">No subscription data</div>}
          </div>
        </div>
      )}

      {activeTab === 'placements' && (
        <div className="mt-16">
          <div className="summary-cards">
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{pa.placements?.total || 0}</div>
              <div className="summary-card__label">Total Placements</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-success">{formatCurrency(pa.placements?.total_value || 0)}</div>
              <div className="summary-card__label">Total Value</div>
            </div>
          </div>

          <div className="chart-grid mt-16">
            <div className="card">
              <h3>By Type</h3>
              {placementsByType.length > 0 ? <ReactECharts option={makePieOption(placementsByType)} style={{ height: 280 }} /> : <div className="empty-state">No data</div>}
            </div>
            <div className="card">
              <h3>By Status</h3>
              {placementStatusData.length > 0 ? <ReactECharts option={makeBarOption(placementStatusData)} style={{ height: 280 }} /> : <div className="empty-state">No data</div>}
            </div>
          </div>

          {pa.placements?.top_artists && pa.placements.top_artists.length > 0 && (
            <div className="detail-section mt-16">
              <h3>Top Artists by Placement Value</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Artist</th><th>Total Value</th><th>Count</th></tr></thead>
                  <tbody>
                    {pa.placements.top_artists.map((a, i) => (
                      <tr key={i} className="clickable-row" onClick={() => a.id && (window.location.hash = '', window.location.pathname = `/artists/${a.id}`)}>
                        <td className="font-semibold">{a.stage_name || a.name || a.artist_name}</td>
                        <td>{formatCurrency(a.total_value)}</td>
                        <td>{a.count || a.placement_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="mt-16">
          <div className="summary-cards">
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{pa.assets?.total || totalAssets}</div>
              <div className="summary-card__label">Total Assets</div>
            </div>
          </div>

          <div className="chart-grid mt-16">
            <div className="card">
              <h3>By File Type</h3>
              {assetsByType.length > 0 ? <ReactECharts option={makePieOption(assetsByType)} style={{ height: 280 }} /> : <div className="empty-state">No data</div>}
            </div>
            <div className="card">
              <h3>By Genre</h3>
              {assetsByGenre.length > 0 ? <ReactECharts option={makeBarOption(assetsByGenre)} style={{ height: 280 }} /> : <div className="empty-state">No data</div>}
            </div>
          </div>

          {pa.assets?.most_placed && pa.assets.most_placed.length > 0 && (
            <div className="detail-section mt-16">
              <h3>Most Placed Assets</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Asset</th><th>Type</th><th>Genre</th><th>Placements</th></tr></thead>
                  <tbody>
                    {pa.assets.most_placed.map((a, i) => (
                      <tr key={i}>
                        <td className="font-semibold">{a.title}</td>
                        <td><span className="badge badge--active">{a.file_type}</span></td>
                        <td>{a.genre || '--'}</td>
                        <td>{a.placement_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="mt-16">
          <div className="summary-cards">
            <div className="summary-card text-center">
              <div className="summary-card__value text-success">{formatCurrency(pa.revenue?.total || grossRevenue)}</div>
              <div className="summary-card__label">Total Revenue</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-danger">{formatCurrency(pa.revenue?.total_expenses || 0)}</div>
              <div className="summary-card__label">Total Expenses</div>
            </div>
          </div>

          {monthlyRevenue.length > 0 && (
            <div className="card mt-16">
              <h3>Monthly Revenue</h3>
              <ReactECharts
                style={{ height: 300 }}
                option={{
                  backgroundColor: 'transparent',
                  tooltip: { trigger: 'axis', ...chartTooltip, formatter: (p) => p.map((s) => `${s.seriesName}: ${formatCurrency(s.value)}`).join('<br/>') },
                  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: monthlyRevenue.map((d) => d.month),
                    axisLabel: { color: '#5c5e78', fontSize: 11, rotate: 30 },
                    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
                  },
                  yAxis: { type: 'value', axisLabel: { color: '#5c5e78', formatter: (v) => `$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } } },
                  series: [{
                    name: 'Revenue',
                    type: 'line',
                    data: monthlyRevenue.map((d) => d.amount || d.revenue || 0),
                    smooth: true,
                    lineStyle: { color: '#22c55e', width: 2 },
                    itemStyle: { color: '#22c55e' },
                    areaStyle: { color: 'rgba(34, 197, 94, 0.1)' },
                  }],
                }}
              />
            </div>
          )}

          {topEarners.length > 0 && (
            <div className="detail-section mt-16">
              <h3>Top Earning Artists</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Artist</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topEarners.map((a, i) => (
                      <tr key={i} className="clickable-row" onClick={() => a.id && (window.location.hash = '', window.location.pathname = `/artists/${a.id}`)}>
                        <td className="font-semibold">{a.stage_name || a.name || a.artist_name}</td>
                        <td>{formatCurrency(a.total_revenue || a.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className="mt-16">
          <div className="summary-cards">
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{deliveries.total_projects || totalProjects}</div>
              <div className="summary-card__label">Total Projects</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-warning">{deliveries.overdue_tasks || 0}</div>
              <div className="summary-card__label">Overdue Tasks</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-secondary">
                {deliveries.avg_project_duration ? `${Math.round(deliveries.avg_project_duration)} days` : '--'}
              </div>
              <div className="summary-card__label">Avg. Project Duration</div>
            </div>
          </div>

          <div className="chart-grid mt-16">
            {deliveries.projects_by_status && (
              <div className="card">
                <h3>Projects by Status</h3>
                <ReactECharts option={makeBarOption(objToArray(
                  (Array.isArray(deliveries.projects_by_status) ? deliveries.projects_by_status : []).reduce(
                    (acc, r) => { acc[r.status] = r.count; return acc; }, {}
                  )
                ))} style={{ height: 280 }} />
              </div>
            )}
            {deliveries.tasks_by_status && (
              <div className="card">
                <h3>Tasks by Status</h3>
                <ReactECharts option={makePieOption(objToArray(
                  (Array.isArray(deliveries.tasks_by_status) ? deliveries.tasks_by_status : []).reduce(
                    (acc, r) => { acc[r.status] = r.count; return acc; }, {}
                  )
                ))} style={{ height: 280 }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="detail-section mt-24">
        <h3>Advanced Analytics</h3>
        <p className="text-sm text-secondary" style={{ lineHeight: '1.6', marginBottom: '12px' }}>
          Explore deeper cross-module insights including metadata coverage matrices,
          revenue waterfall analysis, placement pipeline funnels, and subscription-tier
          performance correlations.
        </p>
        <Link to="/admin/analytics" className="btn btn-primary btn-sm">
          Open Deep Analytics
        </Link>
      </div>
    </div>
  );
}
