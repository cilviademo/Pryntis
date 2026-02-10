import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const chartTooltip = {
  backgroundColor: '#1a1d27',
  borderColor: '#2d3143',
  textStyle: { color: '#e4e6ef' },
};

function objToArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return Object.entries(obj).map(([name, count]) => ({
    name: name.replace(/_/g, ' '),
    value: parseInt(count, 10),
  }));
}

const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/dashboard/summary');
        setSummary(data);
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

  const projectBarOption = projectStatusData.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: projectStatusData.map((d) => d.name),
      axisLabel: { color: '#8890a8', fontSize: 12 },
      axisLine: { lineStyle: { color: '#2d3143' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#1c2030' } },
      axisLabel: { color: '#8890a8', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: projectStatusData.map((d, i) => ({
        value: d.value,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  } : null;

  const artistPieOption = artistStatusData.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...chartTooltip },
    legend: { bottom: 0, textStyle: { color: '#8890a8', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#151820', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#e8eaf0' },
      },
      data: artistStatusData.map((d, i) => ({
        ...d,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    }],
  } : null;

  const placementBarOption = placementStatusData.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: placementStatusData.map((d) => d.name),
      axisLabel: { color: '#8890a8', fontSize: 12 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#1c2030' } },
      axisLabel: { color: '#8890a8', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: placementStatusData.map((d, i) => ({
        value: d.value,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
      barWidth: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  } : null;

  const subscriptionData = (summary.subscriptionDistribution || []).map((s) => ({
    name: s.tier_name || 'Unknown',
    value: s.subscriber_count || 0,
  }));
  const subscriptionPieOption = subscriptionData.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...chartTooltip },
    legend: { bottom: 0, textStyle: { color: '#8890a8', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: 6, borderColor: '#12141c', borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#e4e6ef' },
      },
      data: subscriptionData.map((d, i) => ({
        ...d,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    }],
  } : null;

  return (
    <div>
      <div className="page-header">
        <h2>Analytics</h2>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card__label">Total Artists</div>
          <div className="summary-card__value">{totalArtists}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Total Projects</div>
          <div className="summary-card__value">{totalProjects}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Total Assets</div>
          <div className="summary-card__value">{totalAssets}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Gross Revenue</div>
          <div className="summary-card__value">{formatCurrency(grossRevenue)}</div>
        </div>
      </div>

      <div className="summary-cards" style={{ marginTop: '16px' }}>
        <div className="summary-card">
          <div className="summary-card__label">Recoupable Balance</div>
          <div className="summary-card__value">{formatCurrency(recoupableBalance)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Pipeline Value</div>
          <div className="summary-card__value">{formatCurrency(pipelineValue)}</div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '24px 0' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Projects by Status</h3>
          {projectBarOption ? (
            <ReactECharts option={projectBarOption} style={{ height: 300 }} />
          ) : (
            <div className="empty-state">No project data</div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Artists by Status</h3>
          {artistPieOption ? (
            <ReactECharts option={artistPieOption} style={{ height: 300 }} />
          ) : (
            <div className="empty-state">No artist data</div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Placements by Status</h3>
          {placementBarOption ? (
            <ReactECharts option={placementBarOption} style={{ height: 300 }} />
          ) : (
            <div className="empty-state">No placement data</div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Subscription Distribution</h3>
          {subscriptionPieOption ? (
            <ReactECharts option={subscriptionPieOption} style={{ height: 300 }} />
          ) : (
            <div className="empty-state">No subscription data</div>
          )}
        </div>
      </div>

      <div className="detail-section">
        <h3>Advanced Analytics</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          Apache Superset integration is available for advanced analytics, custom dashboards,
          and deep data exploration. See <code>docs/architecture.md</code> for setup instructions.
        </p>
      </div>
    </div>
  );
}
