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
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

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
  ];
  if (isAdmin) tabs.push({ key: 'audit', label: 'Audit Log' });

  return (
    <div>
      <div className="page-header">
        <h2>Pass - Subscriptions</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={openCreateTier}>Add Tier</button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={openCreateSub}>Assign Subscription</button>
          )}
        </div>
      </div>

      {error && <div className="empty-state">{error}</div>}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--color-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius) var(--radius) 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>{activeSubs}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Active Subscriptions</div>
            </div>
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>{tiers.length}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Tiers Available</div>
            </div>
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>{subscriptions.length}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Total Subscriptions</div>
            </div>
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-warning)' }}>
                {subscriptions.filter((s) => s.status === 'expired' || s.status === 'suspended').length}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Expired / Suspended</div>
            </div>
          </div>

          {/* Tier Distribution */}
          {Object.keys(tierDistribution).length > 0 && (
            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>Active Tier Distribution</h4>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {Object.entries(tierDistribution).map(([tier, count]) => (
                  <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: TIER_COLORS[tier] || '#6b7280' }} />
                    <span style={{ fontSize: '14px' }}>{tier}: <strong>{count}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tier Cards */}
          <div className="detail-section">
            <h3>Subscription Tiers</h3>
            {tiers.length === 0 ? (
              <div className="empty-state">No tiers configured</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {tiers.map((tier) => {
                  const limits = tier.limits || {};
                  const color = TIER_COLORS[tier.name] || '#6b7280';
                  return (
                    <div key={tier.id} className="card" style={{ padding: '20px', borderTop: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px' }}>{tier.name}</h4>
                        {isAdmin && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditTier(tier)}>Edit</button>
                        )}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color, marginBottom: '8px' }}>
                        {tier.price_monthly != null && Number(tier.price_monthly) > 0 ? `$${Number(tier.price_monthly).toFixed(2)}` : 'Free'}
                        {tier.price_monthly != null && Number(tier.price_monthly) > 0 && <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/mo</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        Access Level: <span className="badge badge--in_progress">{tier.access_level || '--'}</span>
                      </div>
                      {tier.description && (
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '8px 0' }}>{tier.description}</p>
                      )}
                      {/* Limits */}
                      <div style={{ fontSize: '12px', margin: '12px 0 8px', padding: '8px', background: 'var(--color-bg)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>Limits</div>
                        <div>Assets: {limits.assets === -1 ? 'Unlimited' : limits.assets || '--'}</div>
                        <div>Placements: {limits.placements === -1 ? 'Unlimited' : limits.placements || '--'}</div>
                      </div>
                      {tier.features && (Array.isArray(tier.features) ? tier.features : []).length > 0 && (
                        <ul style={{ margin: '8px 0 0 0', padding: '0 0 0 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          {(Array.isArray(tier.features) ? tier.features : []).map((f, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
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

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="detail-section">
          <h3>Artist Subscriptions</h3>
          <div className="filter-bar">
            <input
              placeholder="Search by artist name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                          {sub.stage_name && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sub.stage_name}</div>}
                        </td>
                        <td>
                          <span style={{ color: TIER_COLORS[sub.tier_name] || 'inherit', fontWeight: 600 }}>
                            {sub.tier_name || sub.tier_id}
                          </span>
                        </td>
                        <td>{sub.access_level || '--'}</td>
                        <td>
                          <span className={`badge badge--${sub.status || 'active'}`}>
                            {(sub.status || 'active').replace(/_/g, ' ')}
                          </span>
                          {isExpired && sub.status === 'active' && (
                            <span style={{ fontSize: '10px', color: 'var(--color-danger)', display: 'block' }}>Past End Date</span>
                          )}
                        </td>
                        <td>{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '--'}</td>
                        <td>{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '--'}</td>
                        {canEdit && (
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditSub(sub)}>Edit</button>
                          </td>
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

      {/* Feature Matrix Tab */}
      {activeTab === 'features' && (
        <div className="detail-section">
          <h3>Feature Matrix</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Comparison of features and limits available at each subscription tier.
          </p>
          {featureMatrix.length === 0 ? (
            <div className="empty-state">No tiers configured</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    {featureMatrix.map((tier) => (
                      <th key={tier.id} style={{ textAlign: 'center', color: TIER_COLORS[tier.name] || 'inherit' }}>
                        {tier.name}
                        <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                          {Number(tier.price_monthly) > 0 ? `$${Number(tier.price_monthly).toFixed(2)}/mo` : 'Free'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Asset Limit</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center' }}>
                        {tier.limits?.assets === -1 ? 'Unlimited' : tier.limits?.assets || '--'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Placement Limit</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center' }}>
                        {tier.limits?.placements === -1 ? 'Unlimited' : tier.limits?.placements || '--'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Dashboard Access</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center', color: 'var(--color-success)' }}>Yes</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Analytics</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center' }}>
                        {tier.access_level >= 3 ? 'Advanced' : tier.access_level >= 2 ? 'Standard' : 'Basic'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Placement Tracking</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center', color: tier.access_level >= 2 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {tier.access_level >= 2 ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Ownership Reports</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center' }}>
                        {tier.access_level >= 3 ? 'Full Suite' : tier.access_level >= 2 ? 'Basic' : 'No'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Revenue Tracking</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center', color: tier.access_level >= 3 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {tier.access_level >= 3 ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Priority Support</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center', color: tier.access_level >= 3 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {tier.access_level >= 3 ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>API Access</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center', color: tier.access_level >= 5 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {tier.access_level >= 5 ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Custom Integrations</td>
                    {featureMatrix.map((tier) => (
                      <td key={tier.id} style={{ textAlign: 'center', color: tier.access_level >= 5 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                        {tier.access_level >= 5 ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab (admin only) */}
      {activeTab === 'audit' && isAdmin && (
        <div className="detail-section">
          <h3>Audit Log</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Recent subscription and tier changes tracked for compliance.
          </p>
          {auditLog.length === 0 ? (
            <div className="empty-state">No audit entries yet</div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(entry.created_at).toLocaleString()}</td>
                      <td>{entry.user_name || entry.user_email || '--'}</td>
                      <td>
                        <span className="badge badge--active">
                          {(entry.action || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{entry.entity_type}</td>
                      <td style={{ fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.details ? JSON.stringify(entry.details) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="modal-overlay" onClick={() => setShowTierModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTier ? 'Edit Tier' : 'Add Tier'}</h3>
            <form onSubmit={submitTier}>
              {tierFormError && <div className="login-error" style={{ marginBottom: '16px' }}>{tierFormError}</div>}
              <div className="form-group">
                <label>Name *</label>
                <input value={tierForm.name} onChange={handleTierChange('name')} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

      {/* Subscription Modal */}
      {showSubModal && (
        <div className="modal-overlay" onClick={() => setShowSubModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSub ? 'Edit Subscription' : 'Assign Subscription'}</h3>
            <form onSubmit={submitSub}>
              {subFormError && <div className="login-error" style={{ marginBottom: '16px' }}>{subFormError}</div>}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
