import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AssetDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [asset, setAsset] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Tag management
  const [newTag, setNewTag] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  const loadAsset = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/assets/${id}`);
      setAsset(data);

      // Load related data in parallel -- these may 404
      const promises = [
        api.get(`/placements?asset_id=${id}`).catch(() => []),
        api.get(`/assets/${id}/ownership`).catch(() => []),
        api.get(`/assets/${id}/usage`).catch(() => []),
      ];
      const [p, o, u] = await Promise.all(promises);
      setPlacements(Array.isArray(p) ? p : []);
      setOwnership(Array.isArray(o) ? o : []);
      setUsageRecords(Array.isArray(u) ? u : []);
    } catch (err) {
      setError('Failed to load asset');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    setAddingTag(true);
    try {
      await api.post(`/assets/${id}/tags`, { tag: newTag.trim() });
      setNewTag('');
      const data = await api.get(`/assets/${id}`);
      setAsset(data);
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await api.del(`/assets/${id}/tags/${tagId}`);
      const data = await api.get(`/assets/${id}`);
      setAsset(data);
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  if (loading) return <div className="loading">Loading asset...</div>;
  if (error && !asset) return <div className="empty-state">{error}</div>;
  if (!asset) return <div className="empty-state">Asset not found</div>;

  const tags = asset.tags || [];
  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Ownership warning: check if any type totals != 100
  const ownershipByType = {};
  ownership.forEach((o) => {
    const type = o.ownership_type || o.type || 'unknown';
    if (!ownershipByType[type]) ownershipByType[type] = 0;
    ownershipByType[type] += parseFloat(o.share_percentage || o.percentage || 0);
  });
  const ownershipWarnings = Object.entries(ownershipByType)
    .filter(([, total]) => Math.abs(total - 100) > 0.01)
    .map(([type, total]) => `${type}: ${total.toFixed(1)}%`);

  // Usage chart data
  const usageChartOption = usageRecords.length > 0 ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1d27',
      borderColor: '#2d3143',
      textStyle: { color: '#e4e6ef' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: usageRecords.map((r) => r.period || r.date || ''),
      axisLabel: { color: '#8890a8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#2d3143' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#8890a8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#2d3143' } },
    },
    series: [{
      type: 'line',
      data: usageRecords.map((r) => r.count || r.plays || r.streams || 0),
      smooth: true,
      lineStyle: { color: '#6c63ff', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(108, 99, 255, 0.3)' },
            { offset: 1, color: 'rgba(108, 99, 255, 0.02)' },
          ],
        },
      },
      itemStyle: { color: '#6c63ff' },
    }],
  } : null;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'tags', label: `Tags (${tags.length})` },
    { key: 'placements', label: `Placements (${placements.length})` },
    { key: 'ownership', label: `Ownership (${ownership.length})` },
    { key: 'usage', label: 'Usage' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            <Link to="/assets">Assets</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <span>{asset.title}</span>
          </div>
          <h2>{asset.title}</h2>
        </div>
        <span className={`badge badge--${asset.file_type || 'unknown'}`}>
          {asset.file_type || 'unknown'}
        </span>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', marginBottom: '-1px', borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="detail-section">
          <h3>Metadata</h3>
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-field__label">Type</span>
              <span className="detail-field__value">{asset.file_type || '--'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Genre</span>
              <span className="detail-field__value">{asset.genre || '--'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">BPM</span>
              <span className="detail-field__value">{asset.bpm || '--'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Key</span>
              <span className="detail-field__value">{asset.key_signature || '--'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Duration</span>
              <span className="detail-field__value">{formatDuration(asset.duration)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Artist</span>
              <span className="detail-field__value">
                {asset.artist_id ? (
                  <Link to={`/artists/${asset.artist_id}`}>
                    {asset.artist_stage_name || asset.artist_name || 'View Artist'}
                  </Link>
                ) : '--'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Project</span>
              <span className="detail-field__value">
                {asset.project_id ? (
                  <Link to={`/projects/${asset.project_id}`}>
                    {asset.project_title || 'View Project'}
                  </Link>
                ) : '--'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">External URL</span>
              <span className="detail-field__value">
                {asset.external_url ? (
                  <a href={asset.external_url} target="_blank" rel="noopener noreferrer">{asset.external_url}</a>
                ) : '--'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Created</span>
              <span className="detail-field__value">
                {asset.created_at ? new Date(asset.created_at).toLocaleDateString() : '--'}
              </span>
            </div>
          </div>
          {asset.description && (
            <div style={{ marginTop: '16px' }}>
              <span className="detail-field__label">Description</span>
              <p className="detail-field__value" style={{ marginTop: '4px' }}>{asset.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="detail-section">
          <h3>Tags</h3>
          {tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {tags.map((tag) => (
                <span
                  key={tag.id || tag.tag}
                  className="badge badge--active"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px' }}
                >
                  {tag.tag || tag.name}
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: '16px' }}>No tags</div>
          )}
          {canEdit && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                className="form-group"
                style={{ padding: '8px 12px', width: '220px', margin: 0 }}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddTag} disabled={addingTag}>
                {addingTag ? 'Adding...' : 'Add Tag'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Placements Tab */}
      {activeTab === 'placements' && (
        <div className="detail-section">
          <h3>Placements</h3>
          {placements.length === 0 ? (
            <div className="empty-state">No placements for this asset</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Status</th>
                    <th>Fee</th>
                    <th>Placed Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td>{p.platform || p.placement_type || '--'}</td>
                      <td>
                        <span className={`badge badge--${p.status}`}>
                          {(p.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{p.fee != null ? `$${Number(p.fee).toLocaleString()}` : '--'}</td>
                      <td>{p.placed_date ? new Date(p.placed_date).toLocaleDateString() : '--'}</td>
                      <td>{p.notes || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Ownership Tab */}
      {activeTab === 'ownership' && (
        <div className="detail-section">
          <h3>Ownership Splits</h3>
          {ownershipWarnings.length > 0 && (
            <div className="login-error" style={{ marginBottom: '16px' }}>
              Warning: Ownership splits do not total 100% for: {ownershipWarnings.join(', ')}
            </div>
          )}
          {ownership.length === 0 ? (
            <div className="empty-state">No ownership records</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Type</th>
                    <th>Share %</th>
                    <th>Territory</th>
                  </tr>
                </thead>
                <tbody>
                  {ownership.map((o, idx) => (
                    <tr key={o.id || idx}>
                      <td>{o.owner_name || o.artist_name || '--'}</td>
                      <td>{o.ownership_type || o.type || '--'}</td>
                      <td>{o.share_percentage != null ? `${o.share_percentage}%` : o.percentage != null ? `${o.percentage}%` : '--'}</td>
                      <td>{o.territory || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="detail-section">
          <h3>Usage Over Time</h3>
          {usageChartOption ? (
            <ReactECharts option={usageChartOption} style={{ height: 300, marginBottom: '24px' }} />
          ) : (
            <div className="empty-state" style={{ marginBottom: '24px' }}>No usage data available for chart</div>
          )}

          <h3>Usage Records</h3>
          {usageRecords.length === 0 ? (
            <div className="empty-state">No usage records</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Plays / Streams</th>
                    <th>Revenue</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {usageRecords.map((r, idx) => (
                    <tr key={r.id || idx}>
                      <td>{r.period || r.date || '--'}</td>
                      <td>{r.count || r.plays || r.streams || 0}</td>
                      <td>{r.revenue != null ? `$${Number(r.revenue).toLocaleString()}` : '--'}</td>
                      <td>{r.source || r.platform || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
