import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { capitalize, formatCurrency } from '../utils/formatters';
import ExportButton from '../components/ExportButton';

const CHART_COLORS = ['#0066FF', '#6A00FF', '#00FF84', '#FFB000', '#E10600', '#0066FF'];

export default function BusinessOpsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canView = ['owner', 'admin', 'manager'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('ledger');
  const [ledger, setLedger] = useState([]);
  const [producerPoints, setProducerPoints] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [approvals, setApprovals] = useState(null);
  const [recoupDetail, setRecoupDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canView) return;
    async function load() {
      try {
        setLoading(true);
        const [ledgerRes, pointsRes, conflictsRes, approvalsRes] = await Promise.all([
          api.get('/business/ledger').catch(() => []),
          api.get('/business/producer-points').catch(() => []),
          api.get('/business/ownership-conflicts').catch(() => []),
          api.get('/business/approvals').catch(() => ({})),
        ]);
        setLedger(Array.isArray(ledgerRes) ? ledgerRes : []);
        setProducerPoints(Array.isArray(pointsRes) ? pointsRes : []);
        setConflicts(Array.isArray(conflictsRes) ? conflictsRes : []);
        setApprovals(approvalsRes || {});
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load business data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [canView]);

  async function loadRecoupDetail(artistId) {
    try {
      const data = await api.get(`/business/recoup/${artistId}`);
      setRecoupDetail(data);
    } catch {
      setRecoupDetail(null);
    }
  }

  if (!canView) {
    return (
      <div>
        <h2>Business Operations</h2>
        <p className="mt-16">You do not have permission to view business operations.</p>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading business data...</div>;
  if (error) return <div className="form-error mb-16">{error}</div>;

  const tabs = [
    { key: 'ledger', label: 'Ledger' },
    { key: 'recoup', label: 'Recoupment' },
    { key: 'points', label: 'Producer Points' },
    { key: 'conflicts', label: 'Conflicts' },
    { key: 'approvals', label: 'Approvals' },
  ];

  // Ledger chart — top 10 artists by revenue
  const ledgerChartData = ledger.slice(0, 10);
  const ledgerOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['Revenue', 'Expenses'], textStyle: { color: '#5f6780' } },
    grid: { left: 80, right: 20, top: 40, bottom: 60 },
    xAxis: {
      type: 'category',
      data: ledgerChartData.map((r) => r.stage_name || r.name),
      axisLabel: { color: '#5f6780', rotate: 30 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#5f6780', formatter: (v) => `$${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
    },
    series: [
      {
        name: 'Revenue',
        type: 'bar',
        data: ledgerChartData.map((r) => r.total_revenue),
        itemStyle: { color: '#00FF84' },
      },
      {
        name: 'Expenses',
        type: 'bar',
        data: ledgerChartData.map((r) => r.total_expenses),
        itemStyle: { color: '#E10600' },
      },
    ],
  };

  // Producer points pie
  const writerPoints = producerPoints
    .filter((p) => p.ownership_type === 'writer')
    .slice(0, 8);
  const pointsPieOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} pts ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#5f6780' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: writerPoints.map((p, i) => ({
        name: p.owner_name,
        value: p.total_points,
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      label: { color: '#cbd5e1' },
    }],
  };

  return (
    <div>
      <div className="page-header">
        <h2>Business Operations</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ExportButton entity="revenue" />
        </div>
      </div>

      <div className="tabs mb-16">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab${activeTab === t.key ? ' tab--active' : ''}`}
            onClick={() => { setActiveTab(t.key); setRecoupDetail(null); }}
          >
            {t.label}
            {t.key === 'conflicts' && conflicts.length > 0 && (
              <span className="badge badge--urgent ml-auto">{conflicts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div>
          <div className="summary-cards mb-16">
            <div className="card card--compact">
              <div className="card-label">Total Revenue</div>
              <div className="card-value">{formatCurrency(ledger.reduce((s, r) => s + r.total_revenue, 0))}</div>
            </div>
            <div className="card card--compact">
              <div className="card-label">Total Expenses</div>
              <div className="card-value">{formatCurrency(ledger.reduce((s, r) => s + r.total_expenses, 0))}</div>
            </div>
            <div className="card card--compact">
              <div className="card-label">Net Position</div>
              <div className="card-value">{formatCurrency(ledger.reduce((s, r) => s + r.net, 0))}</div>
            </div>
            <div className="card card--compact">
              <div className="card-label">Unrecouped Artists</div>
              <div className="card-value">{ledger.filter((r) => r.recoup_status === 'unrecouped').length}</div>
            </div>
          </div>

          {ledgerChartData.length > 0 && (
            <div className="card mb-16">
              <h4>Revenue vs Expenses — Top Artists</h4>
              <ReactECharts option={ledgerOption} style={{ height: 320 }} />
            </div>
          )}

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Expenses</th>
                  <th className="text-right">Net</th>
                  <th className="text-center">Status</th>
                  <th className="text-right nowrap">Recoup Remaining</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.id} className="clickable-row" onClick={() => navigate(`/artists/${r.id}`)}>
                    <td>{r.stage_name || r.name}</td>
                    <td className="text-right">{formatCurrency(r.total_revenue)}</td>
                    <td className="text-right">{formatCurrency(r.total_expenses)}</td>
                    <td className="text-right" style={{ color: r.net >= 0 ? '#00FF84' : '#E10600' }}>
                      {formatCurrency(r.net)}
                    </td>
                    <td className="text-center">
                      <span className={`badge badge--${r.recoup_status === 'recouped' ? 'active' : r.recoup_status === 'unrecouped' ? 'urgent' : 'low'}`}>
                        {capitalize(r.recoup_status)}
                      </span>
                    </td>
                    <td className="text-right nowrap">
                      {r.recoup_remaining > 0 ? formatCurrency(r.recoup_remaining) : '--'}
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr><td colSpan="6" className="text-center">No ledger data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECOUPMENT TAB */}
      {activeTab === 'recoup' && (
        <div>
          <p className="mb-16">Select an artist to view detailed recoupment breakdown.</p>

          <div className="grid-3 mb-16">
            {ledger.filter((r) => r.total_expenses > 0).map((r) => (
              <div
                key={r.id}
                className={`card card--compact clickable${recoupDetail?.artist?.id === r.id ? ' card--border-top' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => loadRecoupDetail(r.id)}
                role="button"
                tabIndex={0}
              >
                <h4>{r.stage_name || r.name}</h4>
                <div className="card-label">
                  {formatCurrency(r.total_recouped)} / {formatCurrency(r.total_expenses)} recouped
                </div>
                <span className={`badge badge--${r.recoup_status === 'recouped' ? 'active' : 'urgent'}`}>
                  {capitalize(r.recoup_status)}
                </span>
              </div>
            ))}
          </div>

          {recoupDetail && (
            <div className="card">
              <h3>{recoupDetail.artist.stage_name || recoupDetail.artist.name} — Recoupment</h3>

              <div className="summary-cards mb-16">
                <div className="card card--compact">
                  <div className="card-label">Total Revenue</div>
                  <div className="card-value">{formatCurrency(recoupDetail.summary.total_revenue)}</div>
                </div>
                <div className="card card--compact">
                  <div className="card-label">Total Expenses</div>
                  <div className="card-value">{formatCurrency(recoupDetail.summary.total_expenses)}</div>
                </div>
                <div className="card card--compact">
                  <div className="card-label">Recouped</div>
                  <div className="card-value">{recoupDetail.summary.recoup_percentage}%</div>
                </div>
                <div className="card card--compact">
                  <div className="card-label">Remaining</div>
                  <div className="card-value">{formatCurrency(recoupDetail.summary.recoup_remaining)}</div>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <h4 className="mb-8">Expenses</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recoupDetail.expenses || []).map((e) => (
                        <tr key={e.id}>
                          <td className="capitalize">{e.category}</td>
                          <td className="text-right">{formatCurrency(e.amount)}</td>
                          <td className="nowrap">{e.expense_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="mb-8">Revenue Applied to Recoupment</h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th className="text-right">Applied</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recoupDetail.revenue || []).filter((r) => r.amount_applied_to_recoupment > 0).map((r) => (
                        <tr key={r.id}>
                          <td>{r.source}</td>
                          <td className="text-right">{formatCurrency(r.amount_applied_to_recoupment)}</td>
                          <td className="nowrap">{r.event_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUCER POINTS TAB */}
      {activeTab === 'points' && (
        <div>
          {writerPoints.length > 0 && (
            <div className="card mb-16">
              <h4>Writer Points Distribution</h4>
              <ReactECharts option={pointsPieOption} style={{ height: 320 }} />
            </div>
          )}

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Type</th>
                  <th>PRO</th>
                  <th>IPI</th>
                  <th className="text-right">Assets</th>
                  <th className="text-right">Avg %</th>
                  <th className="text-right">Total Points</th>
                </tr>
              </thead>
              <tbody>
                {producerPoints.map((p, i) => (
                  <tr key={`${p.owner_name}-${p.ownership_type}-${i}`}>
                    <td>{p.owner_name}</td>
                    <td className="capitalize">{p.ownership_type}</td>
                    <td>{p.pro_affiliation || '--'}</td>
                    <td className="nowrap">{p.ipi_number || '--'}</td>
                    <td className="text-right">{p.asset_count}</td>
                    <td className="text-right">{p.avg_percentage}%</td>
                    <td className="text-right">{p.total_points}</td>
                  </tr>
                ))}
                {producerPoints.length === 0 && (
                  <tr><td colSpan="7" className="text-center">No ownership data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFLICTS TAB */}
      {activeTab === 'conflicts' && (
        <div>
          {conflicts.length === 0 ? (
            <div className="card">
              <p className="text-center">No ownership conflicts detected.</p>
            </div>
          ) : (
            <>
              <div className="card card--compact mb-16">
                <div className="card-label">Active Conflicts</div>
                <div className="card-value">{conflicts.length}</div>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Artist</th>
                      <th>Type</th>
                      <th className="text-right">Total %</th>
                      <th>Owners</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflicts.map((c, i) => (
                      <tr key={`${c.asset_id}-${c.ownership_type}-${i}`}>
                        <td>{c.title}</td>
                        <td>{c.stage_name || c.artist_name || '--'}</td>
                        <td className="capitalize">{c.ownership_type}</td>
                        <td className="text-right">
                          <span className="badge badge--urgent">{c.total_percentage}%</span>
                        </td>
                        <td>
                          {(c.owners || []).map((o, j) => (
                            <span key={j} className="badge mr-4">{o.name}: {o.percentage}%</span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* APPROVALS TAB */}
      {activeTab === 'approvals' && approvals && (
        <div>
          <div className="summary-cards mb-16">
            <div className="card card--compact">
              <div className="card-label">Urgent Tasks</div>
              <div className="card-value">{(approvals.urgent_tasks || []).length}</div>
            </div>
            <div className="card card--compact">
              <div className="card-label">Pending Placements</div>
              <div className="card-value">{(approvals.pending_placements || []).length}</div>
            </div>
            <div className="card card--compact">
              <div className="card-label">Expiring Subscriptions</div>
              <div className="card-value">{(approvals.expiring_subscriptions || []).length}</div>
            </div>
          </div>

          {(approvals.urgent_tasks || []).length > 0 && (
            <div className="mb-16">
              <h4 className="mb-8">Urgent / High Priority Tasks</h4>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Artist</th>
                      <th className="text-center">Priority</th>
                      <th>Due</th>
                      <th>Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(approvals.urgent_tasks || []).map((t) => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td>{t.artist_name || '--'}</td>
                        <td className="text-center">
                          <span className={`badge badge--${t.priority}`}>{capitalize(t.priority)}</span>
                        </td>
                        <td className="nowrap">{t.due_date ? t.due_date.split('T')[0] : '--'}</td>
                        <td>{t.assigned_to_name || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(approvals.pending_placements || []).length > 0 && (
            <div className="mb-16">
              <h4 className="mb-8">Pending Placements</h4>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Artist</th>
                      <th>Placed With</th>
                      <th className="text-center">Type</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(approvals.pending_placements || []).map((p) => (
                      <tr key={p.id}>
                        <td>{p.asset_title}</td>
                        <td>{p.artist_name || '--'}</td>
                        <td>{p.placed_with}</td>
                        <td className="text-center capitalize">{p.placement_type}</td>
                        <td className="text-right">{formatCurrency(p.expected_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(approvals.expiring_subscriptions || []).length > 0 && (
            <div>
              <h4 className="mb-8">Expiring Subscriptions (Next 60 Days)</h4>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Artist</th>
                      <th>Tier</th>
                      <th>Expires</th>
                      <th className="text-right">Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(approvals.expiring_subscriptions || []).map((s) => (
                      <tr key={s.id}>
                        <td>{s.stage_name}</td>
                        <td>{s.tier_name}</td>
                        <td className="nowrap">{s.end_date ? s.end_date.split('T')[0] : '--'}</td>
                        <td className="text-right">
                          <span className={`badge badge--${s.days_remaining <= 14 ? 'urgent' : s.days_remaining <= 30 ? 'high' : 'medium'}`}>
                            {s.days_remaining}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
