import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CHART_COLORS = ['#6c63ff', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const REACTION_ICONS = { thumbs_up: '\u{1F44D}', eyes: '\u{1F440}', check: '\u2705', alert: '\u2757' };

function capitalize(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function objToArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return Object.entries(obj).map(([name, count]) => ({
    name: capitalize(name),
    value: parseInt(count, 10),
  }));
}

const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'viewer';
  const isElevated = role === 'admin' || role === 'owner' || role === 'manager';

  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [sum, act, tsk] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/recent-activity').catch(() => []),
          api.get('/tasks?status=open&limit=5').catch(() => []),
        ]);
        setSummary(sum);
        setActivity(Array.isArray(act) ? act : []);
        setTasks(Array.isArray(tsk) ? tsk : []);
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

  const projectBarOption = {
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
  };

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

  // Recoup stacked bar (admin/manager only)
  const recoupStackOption = isElevated ? {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...chartTooltip, formatter: (p) => p.map((s) => `${s.seriesName}: ${formatCurrency(s.value)}`).join('<br/>') },
    legend: { bottom: 0, textStyle: { color: '#8890a8', fontSize: 12 } },
    grid: { left: '3%', right: '4%', bottom: '30px', top: '10px', containLabel: true },
    xAxis: { type: 'category', data: ['Portfolio'], axisLabel: { color: '#8890a8' }, axisLine: { lineStyle: { color: '#2d3143' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8890a8', formatter: (v) => `$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: '#2d3143' } } },
    series: [
      { name: 'Recouped', type: 'bar', stack: 'total', data: [kpi.recoupedAmount || 0], itemStyle: { color: '#22c55e' }, barWidth: '60%' },
      { name: 'Unrecouped', type: 'bar', stack: 'total', data: [kpi.unrecoupedBalance || 0], itemStyle: { color: '#ef4444' }, barWidth: '60%' },
      { name: 'Payable', type: 'bar', stack: 'total', data: [kpi.payableNow || 0], itemStyle: { color: '#3b82f6' }, barWidth: '60%' },
    ],
  } : null;

  // Project throughput (admin/manager only)
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

  const artistPieOption = {
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
  };

  const subscriptionPieOption = {
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
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        {role === 'viewer' && <span className="badge badge--active">View Only</span>}
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card__label">Total Artists</div>
          <div className="summary-card__value">{totalArtists}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Active Projects</div>
          <div className="summary-card__value">{activeProjects}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Total Assets</div>
          <div className="summary-card__value">{totalAssets}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Pending Placements</div>
          <div className="summary-card__value">{pendingPlacements}</div>
        </div>
      </div>

      {/* KPI Cards — manager/admin */}
      {isElevated && (
        <div className="summary-cards mt-16">
          <div className="summary-card">
            <div className="summary-card__label">Gross Revenue</div>
            <div className="summary-card__value">{formatCurrency(kpi.grossRevenue)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__label">Pipeline Value</div>
            <div className="summary-card__value">{formatCurrency(kpi.pipelineValue)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card__label">Payable Now</div>
            <div className="summary-card__value" style={{ color: kpi.payableNow > 0 ? '#22c55e' : 'inherit' }}>
              {formatCurrency(kpi.payableNow)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__label">At-Risk</div>
            <div className="summary-card__value" style={{ color: kpi.atRiskRevenue > 0 ? '#ef4444' : 'inherit' }}>
              {formatCurrency(kpi.atRiskRevenue)}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="dashboard-chart-grid">
        <div className="card">
          <h3>Projects by Status</h3>
          {projectStatusArr.length > 0 ? (
            <ReactECharts option={projectBarOption} style={{ height: 260 }} />
          ) : <div className="empty-state">No project data</div>}
        </div>

        {isElevated && placementBarOption && (
          <div className="card">
            <h3>Placement Pipeline</h3>
            <ReactECharts option={placementBarOption} style={{ height: 260 }} />
          </div>
        )}

        {!isElevated && (
          <div className="card">
            <h3>Artists by Status</h3>
            {artistStatusArr.length > 0 ? (
              <ReactECharts option={artistPieOption} style={{ height: 260 }} />
            ) : <div className="empty-state">No artist data</div>}
          </div>
        )}

        <div className="card">
          <h3>Subscription Distribution</h3>
          {subscriptionData.length > 0 ? (
            <ReactECharts option={subscriptionPieOption} style={{ height: 260 }} />
          ) : <div className="empty-state">No subscription data</div>}
        </div>
      </div>

      {/* Admin/Manager extra charts */}
      {isElevated && (
        <div className="chart-grid mt-24 mb-24">
          <div className="card">
            <h3>Recouped vs Unrecouped vs Payable</h3>
            {recoupStackOption ? (
              <ReactECharts option={recoupStackOption} style={{ height: 280 }} />
            ) : <div className="empty-state">No recoupment data</div>}
          </div>

          <div className="card">
            <h3>Project Throughput (Monthly)</h3>
            {throughputOption ? (
              <ReactECharts option={throughputOption} style={{ height: 280 }} />
            ) : <div className="empty-state">No throughput data</div>}
          </div>
        </div>
      )}

      {/* Activity Feed + Tasks */}
      <div className="dashboard-bottom-grid">
        <div className="detail-section">
          <h3>Recent Activity</h3>
          {activity.length === 0 ? (
            <div className="empty-state">No recent activity</div>
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
                  {activity.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="badge badge--active">{capitalize(item.event_type || '')}</span>
                      </td>
                      <td>{item.summary}</td>
                      <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '--'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' }}>
                          {item.reactions && Array.isArray(item.reactions) && item.reactions.map((r, i) => (
                            <span key={i} className="reaction-pill" title={capitalize(r.reaction)}>
                              {REACTION_ICONS[r.reaction] || r.reaction} {r.count > 0 ? r.count : ''}
                            </span>
                          ))}
                          {item.comment_count > 0 && (
                            <span style={{ color: 'var(--color-text-secondary)', marginLeft: '4px' }}>{item.comment_count} replies</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3>Next Actions</h3>
          {tasks.length === 0 ? (
            <div className="empty-state">No open tasks</div>
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
                    <tr key={task.id}>
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
