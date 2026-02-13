import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TIER_COLORS = {
  Free: '#6b7280',
  Basic: '#3b82f6',
  Pro: '#8b5cf6',
  Enterprise: '#f59e0b',
};

export default function PassPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const canEdit = isAdmin || user?.role === 'manager';

  const [tiers, setTiers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [featureMatrix, setFeatureMatrix] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Tier modal
  const [showTierModal, setShowTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierForm, setTierForm] = useState({
    name: '', description: '', price: '', access_level: '', features: '',
  });
  const [tierFormError, setTierFormError] = useState('');
  const [tierSubmitting, setTierSubmitting] = useState(false);

  // Subscription modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subForm, setSubForm] = useState({
    artist_id: '', tier_id: '', status: 'active', start_date: '', end_date: '',
  });
  const [subFormError, setSubFormError] = useState('');
  const [subSubmitting, setSubSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [
        api.get('/pass/tiers'),
        api.get('/pass/subscriptions'),
        api.get('/pass/feature-matrix'),
      ];
      if (isAdmin) promises.push(api.get('/pass/audit?limit=25'));

      const results = await Promise.all(promises);
      setTiers(Array.isArray(results[0]) ? results[0] : []);
      setSubscriptions(Array.isArray(results[1]) ? results[1] : []);
      setFeatureMatrix(Array.isArray(results[2]) ? results[2] : []);
      if (isAdmin && results[3]) setAuditLog(Array.isArray(results[3]) ? results[3] : []);
    } catch (err) {
      setError('Failed to load subscription data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tier handlers
  const openCreateTier = () => {
    setEditingTier(null);
    setTierForm({ name: '', description: '', price: '', access_level: '', features: '' });
    setTierFormError('');
    setShowTierModal(true);
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name || '',
      description: tier.description || '',
      price: tier.price_monthly != null ? String(tier.price_monthly) : (tier.price != null ? String(tier.price) : ''),
      access_level: tier.access_level || '',
      features: Array.isArray(tier.features) ? tier.features.join(', ') : (tier.features || ''),
    });
    setTierFormError('');
    setShowTierModal(true);
  };

  const handleTierChange = (field) => (e) => setTierForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitTier = async (e) => {
    e.preventDefault();
    if (!tierForm.name.trim()) { setTierFormError('Name is required'); return; }
    if (!tierForm.access_level) { setTierFormError('Access level is required'); return; }
    setTierFormError('');
    setTierSubmitting(true);
    try {
      const payload = {
        ...tierForm,
        price_monthly: tierForm.price ? parseFloat(tierForm.price) : null,
        features: tierForm.features ? tierForm.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      };
      delete payload.price;
      if (editingTier) {
        await api.put(`/pass/tiers/${editingTier.id}`, payload);
      } else {
        await api.post('/pass/tiers', payload);
      }
      setShowTierModal(false);
      fetchData();
    } catch (err) {
      setTierFormError(err.message || 'Failed to save tier');
    } finally {
      setTierSubmitting(false);
    }
  };

  // Subscription handlers
  const openCreateSub = () => {
    setEditingSub(null);
    setSubForm({ artist_id: '', tier_id: '', status: 'active', start_date: '', end_date: '' });
    setSubFormError('');
    setShowSubModal(true);
  };

  const openEditSub = (sub) => {
    setEditingSub(sub);
    setSubForm({
      artist_id: sub.artist_id || '',
      tier_id: sub.tier_id || '',
      status: sub.status || 'active',
      start_date: sub.start_date ? sub.start_date.split('T')[0] : '',
      end_date: sub.end_date ? sub.end_date.split('T')[0] : '',
    });
    setSubFormError('');
    setShowSubModal(true);
  };

  const handleSubChange = (field) => (e) => setSubForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitSub = async (e) => {
    e.preventDefault();
    if (!subForm.artist_id.trim()) { setSubFormError('Artist ID is required'); return; }
    if (!subForm.tier_id) { setSubFormError('Tier is required'); return; }
    setSubFormError('');
    setSubSubmitting(true);
    try {
      const payload = { ...subForm };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (editingSub) {
        await api.put(`/pass/subscriptions/${editingSub.id}`, payload);
      } else {
        await api.post('/pass/subscriptions', payload);
      }
      setShowSubModal(false);
      fetchData();
    } catch (err) {
      setSubFormError(err.message || 'Failed to save subscription');
    } finally {
      setSubSubmitting(false);
    }
  };

  // Filter subscriptions
  const filteredSubs = subscriptions.filter((sub) => {
    if (search) {
      const q = search.toLowerCase();
      const name = (sub.artist_name || sub.stage_name || '').toLowerCase();
      if (!name.includes(q)) return false;
    }
    if (statusFilter && sub.status !== statusFilter) return false;
    return true;
  });

  // Creator stats: derive asset count and placement count per artist from subscription data
  const creatorStatsMap = {};
  subscriptions.forEach((s) => {
    const artistKey = s.artist_id;
    if (!creatorStatsMap[artistKey]) {
      creatorStatsMap[artistKey] = {
        assetCount: s.asset_count != null ? Number(s.asset_count) : 0,
        placementCount: s.placement_count != null ? Number(s.placement_count) : 0,
      };
    } else {
      if (s.asset_count != null) creatorStatsMap[artistKey].assetCount = Number(s.asset_count);
      if (s.placement_count != null) creatorStatsMap[artistKey].placementCount = Number(s.placement_count);
    }
  });

  // Summary stats
  const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
  const tierDistribution = {};
  subscriptions.forEach((s) => {
    if (s.status === 'active') {
      tierDistribution[s.tier_name] = (tierDistribution[s.tier_name] || 0) + 1;
    }
  });

  if (loading) return <div className="loading">Loading subscription data...</div>;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'features', label: 'Feature Matrix' },
    { key: 'roadmap', label: 'Roadmap' },
  ];
  if (isAdmin) tabs.push({ key: 'audit', label: 'Audit Log' });

  return (
    <div>
      <div className="page-header">
        <h2>Pass - Subscriptions</h2>
        <div className="flex gap-8">
          {isAdmin && (
            <button className="btn btn-secondary" onClick={openCreateTier}>Add Tier</button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={openCreateSub}>Assign Subscription</button>
          )}
        </div>
      </div>

      {error && <div className="empty-state">{error}</div>}

      <div className="tabs">
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
        <>
          <div className="summary-cards">
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{activeSubs}</div>
              <div className="summary-card__label">Active Subscriptions</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{tiers.length}</div>
              <div className="summary-card__label">Tiers Available</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-primary">{subscriptions.length}</div>
              <div className="summary-card__label">Total Subscriptions</div>
            </div>
            <div className="summary-card text-center">
              <div className="summary-card__value text-warning">
                {subscriptions.filter((s) => s.status === 'expired' || s.status === 'suspended').length}
              </div>
              <div className="summary-card__label">Expired / Suspended</div>
            </div>
          </div>

          {Object.keys(tierDistribution).length > 0 && (
            <div className="card card--compact mb-24">
              <h4>Active Tier Distribution</h4>
              <div className="flex gap-16 flex-wrap">
                {Object.entries(tierDistribution).map(([tier, count]) => (
                  <div key={tier} className="flex items-center gap-8">
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: TIER_COLORS[tier] || '#6b7280' }} />
                    <span className="text-sm">{tier}: <strong>{count}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h3>Subscription Tiers</h3>
            {tiers.length === 0 ? (
              <div className="empty-state">No tiers configured</div>
            ) : (
              <div className="card-grid">
                {tiers.map((tier) => {
                  const limits = tier.limits || {};
                  const color = TIER_COLORS[tier.name] || '#6b7280';
                  return (
                    <div key={tier.id} className="card card--compact card--border-top" style={{ borderTopColor: color }}>
                      <div className="card-header">
                        <h4 style={{ margin: 0 }}>{tier.name}</h4>
                        {isAdmin && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditTier(tier)}>Edit</button>
                        )}
                      </div>
                      <div className="card-price" style={{ color }}>
                        {tier.price_monthly != null && Number(tier.price_monthly) > 0 ? `$${Number(tier.price_monthly).toFixed(2)}` : 'Free'}
                        {tier.price_monthly != null && Number(tier.price_monthly) > 0 && <span className="card-price__period">/mo</span>}
                      </div>
                      <div className="text-sm text-secondary mb-8">
                        Access Level: <span className="badge badge--in_progress">{tier.access_level || '--'}</span>
                      </div>
                      {tier.description && <p className="text-sm text-secondary mb-8">{tier.description}</p>}
                      <div className="card-limits">
                        <div className="card-limits__title">Limits</div>
                        <div>Assets: {limits.assets === -1 ? 'Unlimited' : limits.assets || '--'}</div>
                        <div>Placements: {limits.placements === -1 ? 'Unlimited' : limits.placements || '--'}</div>
                      </div>
                      {tier.features && (Array.isArray(tier.features) ? tier.features : []).length > 0 && (
                        <ul className="card-features">
                          {(Array.isArray(tier.features) ? tier.features : []).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'subscriptions' && (
        <div className="detail-section">
          <h3>Artist Subscriptions</h3>
          <div className="filter-bar">
            <input placeholder="Search by artist name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
            <span className="filter-count">{filteredSubs.length} subscription{filteredSubs.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredSubs.length === 0 ? (
            <div className="empty-state">No subscriptions found</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Artist</th>
                    <th>Tier</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Creator Stats</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map((sub) => {
                    const isExpired = sub.end_date && new Date(sub.end_date) < new Date();
                    return (
                      <tr key={sub.id} style={isExpired && sub.status === 'active' ? { opacity: 0.7 } : undefined}>
                        <td>
                          <div>{sub.artist_name || sub.artist_id}</div>
                          {sub.stage_name && <div className="text-xs text-muted">{sub.stage_name}</div>}
                        </td>
                        <td>
                          <span className="font-semibold" style={{ color: TIER_COLORS[sub.tier_name] || 'inherit' }}>
                            {sub.tier_name || sub.tier_id}
                          </span>
                        </td>
                        <td>{sub.access_level || '--'}</td>
                        <td>
                          <span className={`badge badge--${sub.status || 'active'}`}>
                            {(sub.status || 'active').replace(/_/g, ' ')}
                          </span>
                          {isExpired && sub.status === 'active' && (
                            <span className="text-xs text-danger" style={{ display: 'block' }}>Past End Date</span>
                          )}
                        </td>
                        <td className="nowrap">
                          <div className="text-xs text-secondary">
                            Assets: <span className="font-semibold">{creatorStatsMap[sub.artist_id]?.assetCount || 0}</span>
                          </div>
                          <div className="text-xs text-secondary">
                            Placements: <span className="font-semibold">{creatorStatsMap[sub.artist_id]?.placementCount || 0}</span>
                          </div>
                        </td>
                        <td>{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '--'}</td>
                        <td>{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '--'}</td>
                        {canEdit && (
                          <td><button className="btn btn-secondary btn-sm" onClick={() => openEditSub(sub)}>Edit</button></td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'features' && (
        <div className="detail-section">
          <h3>Feature Matrix</h3>
          <p className="text-sm text-secondary mb-16">Comparison of features and limits available at each subscription tier.</p>
          {featureMatrix.length === 0 ? (
            <div className="empty-state">No tiers configured</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    {featureMatrix.map((tier) => (
                      <th key={tier.id} className="text-center" style={{ color: TIER_COLORS[tier.name] || 'inherit' }}>
                        {tier.name}
                        <div className="text-xs text-muted" style={{ fontWeight: 400 }}>
                          {Number(tier.price_monthly) > 0 ? `$${Number(tier.price_monthly).toFixed(2)}/mo` : 'Free'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Asset Limit', render: (t) => t.limits?.assets === -1 ? 'Unlimited' : t.limits?.assets || '--' },
                    { label: 'Placement Limit', render: (t) => t.limits?.placements === -1 ? 'Unlimited' : t.limits?.placements || '--' },
                    { label: 'Dashboard Access', render: () => 'Yes', className: () => 'text-center text-success' },
                    { label: 'Analytics', render: (t) => t.access_level >= 3 ? 'Advanced' : t.access_level >= 2 ? 'Standard' : 'Basic' },
                    { label: 'Placement Tracking', render: (t) => t.access_level >= 2 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 2 ? 'text-success' : 'text-muted'}` },
                    { label: 'Ownership Reports', render: (t) => t.access_level >= 3 ? 'Full Suite' : t.access_level >= 2 ? 'Basic' : 'No' },
                    { label: 'Revenue Tracking', render: (t) => t.access_level >= 3 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 3 ? 'text-success' : 'text-muted'}` },
                    { label: 'Priority Support', render: (t) => t.access_level >= 3 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 3 ? 'text-success' : 'text-muted'}` },
                    { label: 'API Access', render: (t) => t.access_level >= 5 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 5 ? 'text-success' : 'text-muted'}` },
                    { label: 'Custom Integrations', render: (t) => t.access_level >= 5 ? 'Yes' : 'No', className: (t) => `text-center ${t.access_level >= 5 ? 'text-success' : 'text-muted'}` },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="font-semibold">{row.label}</td>
                      {featureMatrix.map((tier) => (
                        <td key={tier.id} className={row.className ? row.className(tier) : 'text-center'}>
                          {row.render(tier)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div className="detail-section">
          <h3>Analog Modeling Roadmap</h3>
          <p className="text-sm text-secondary mb-16">
            Planned feature releases for the Pryntis analog modeling suite. Each phase introduces new capabilities
            aligned with subscription tier availability.
          </p>
          <div className="card-grid">
            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-success)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 1 -- Current</h4>
                <span className="badge badge--active">Live</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Foundation layer available across all tiers. Core digital infrastructure
                for managing music assets and rights.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Included Capabilities</div>
                <div>Digital asset management and cataloging</div>
                <div>Sync licensing workflow automation</div>
                <div>Ownership tracking and chain-of-title records</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: All Tiers</span>
              </div>
            </div>

            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-info)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 2 -- Q2 2026</h4>
                <span className="badge badge--in_progress">In Development</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Introduction of analog sound modeling tools. Authentic vintage
                hardware emulation for modern production workflows.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Planned Capabilities</div>
                <div>Analog tape emulation presets (reel-to-reel, cassette, 8-track)</div>
                <div>Vintage EQ modeling (Pultec, Neve, API style curves)</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: Pro and Enterprise Tiers</span>
              </div>
            </div>

            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-warning)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 3 -- Q3 2026</h4>
                <span className="badge badge--pending">Planned</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Developer and integration tools for third-party hardware connectivity
                and real-time audio processing pipelines.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Planned Capabilities</div>
                <div>Hardware integration SDK for outboard gear connectivity</div>
                <div>Real-time processing API with sub-5ms latency target</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: Enterprise Tier</span>
              </div>
            </div>

            <div className="card card--compact card--border-top" style={{ borderTopColor: 'var(--color-primary)' }}>
              <div className="card-header">
                <h4 className="card-title">Phase 4 -- Q4 2026</h4>
                <span className="badge badge--draft">Roadmap</span>
              </div>
              <p className="text-sm text-secondary mb-8">
                Complete analog modeling suite with native DAW integration.
                Full production-grade toolchain for professional studios.
              </p>
              <div className="card-limits">
                <div className="card-limits__title">Planned Capabilities</div>
                <div>Full analog modeling suite (compressors, preamps, saturators)</div>
                <div>DAW plugins (VST3, AU, AAX) with preset management</div>
              </div>
              <div className="mt-8">
                <span className="text-xs text-muted">Available: Enterprise Tier</span>
              </div>
            </div>
          </div>

          <div className="card card--compact mt-24">
            <h4>Tier Availability Matrix</h4>
            <p className="text-sm text-secondary mb-16">
              Feature availability by subscription tier as each phase is released.
            </p>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th className="text-center">Free</th>
                    <th className="text-center">Basic</th>
                    <th className="text-center">Pro</th>
                    <th className="text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">Phase 1: Digital Asset Management</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Phase 2: Analog Tape and EQ Modeling</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-success">Yes</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Phase 3: Hardware SDK and Processing API</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Phase 4: Full Modeling Suite and DAW Plugins</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-muted">--</td>
                    <td className="text-center text-success">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && isAdmin && (
        <div className="detail-section">
          <h3>Audit Log</h3>
          <p className="text-sm text-secondary mb-16">Recent subscription and tier changes tracked for compliance.</p>
          {auditLog.length === 0 ? (
            <div className="empty-state">No audit entries yet</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id}>
                      <td className="nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                      <td>{entry.user_name || entry.user_email || '--'}</td>
                      <td><span className="badge badge--active">{(entry.action || '').replace(/_/g, ' ')}</span></td>
                      <td className="text-xs">{entry.entity_type}</td>
                      <td className="text-xs truncate" style={{ maxWidth: 300 }}>{entry.details ? JSON.stringify(entry.details) : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showTierModal && (
        <div className="modal-overlay" onClick={() => setShowTierModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTier ? 'Edit Tier' : 'Add Tier'}</h3>
            <form onSubmit={submitTier} className="form-stack">
              {tierFormError && <div className="form-error">{tierFormError}</div>}
              <div className="form-group">
                <label>Name *</label>
                <input value={tierForm.name} onChange={handleTierChange('name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Access Level *</label>
                  <input type="number" min="1" max="5" value={tierForm.access_level} onChange={handleTierChange('access_level')} required />
                </div>
                <div className="form-group">
                  <label>Price (monthly)</label>
                  <input type="number" step="0.01" min="0" value={tierForm.price} onChange={handleTierChange('price')} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={tierForm.description} onChange={handleTierChange('description')} />
              </div>
              <div className="form-group">
                <label>Features (comma separated)</label>
                <input value={tierForm.features} onChange={handleTierChange('features')} placeholder="Feature 1, Feature 2, Feature 3" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTierModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={tierSubmitting}>
                  {tierSubmitting ? 'Saving...' : editingTier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubModal && (
        <div className="modal-overlay" onClick={() => setShowSubModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSub ? 'Edit Subscription' : 'Assign Subscription'}</h3>
            <form onSubmit={submitSub} className="form-stack">
              {subFormError && <div className="form-error">{subFormError}</div>}
              <div className="form-group">
                <label>Artist ID *</label>
                <input value={subForm.artist_id} onChange={handleSubChange('artist_id')} placeholder="Artist UUID" required disabled={!!editingSub} />
              </div>
              <div className="form-group">
                <label>Tier *</label>
                <select value={subForm.tier_id} onChange={handleSubChange('tier_id')} required>
                  <option value="">Select Tier</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (Level {t.access_level})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={subForm.status} onChange={handleSubChange('status')}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={subForm.start_date} onChange={handleSubChange('start_date')} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={subForm.end_date} onChange={handleSubChange('end_date')} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={subSubmitting}>
                  {subSubmitting ? 'Saving...' : editingSub ? 'Update' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
