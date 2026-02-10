import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function PassPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [tiers, setTiers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      const [ts, subs] = await Promise.all([
        api.get('/pass/tiers'),
        api.get('/pass/subscriptions'),
      ]);
      setTiers(Array.isArray(ts) ? ts : []);
      setSubscriptions(Array.isArray(subs) ? subs : []);
    } catch (err) {
      setError('Failed to load subscription data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      price: tier.price != null ? String(tier.price) : '',
      access_level: tier.access_level || '',
      features: Array.isArray(tier.features) ? tier.features.join(', ') : (tier.features || ''),
    });
    setTierFormError('');
    setShowTierModal(true);
  };

  const handleTierChange = (field) => (e) => setTierForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitTier = async (e) => {
    e.preventDefault();
    if (!tierForm.name.trim()) {
      setTierFormError('Name is required');
      return;
    }
    if (!tierForm.access_level.trim()) {
      setTierFormError('Access level is required');
      return;
    }
    setTierFormError('');
    setTierSubmitting(true);
    try {
      const payload = {
        ...tierForm,
        price: tierForm.price ? parseFloat(tierForm.price) : null,
        features: tierForm.features ? tierForm.features.split(',').map((f) => f.trim()).filter(Boolean) : [],
      };
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
    if (!subForm.artist_id.trim()) {
      setSubFormError('Artist ID is required');
      return;
    }
    if (!subForm.tier_id) {
      setSubFormError('Tier is required');
      return;
    }
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
      const name = (sub.artist_name || sub.artist_stage_name || '').toLowerCase();
      if (!name.includes(q)) return false;
    }
    if (statusFilter && sub.status !== statusFilter) return false;
    return true;
  });

  if (loading) return <div className="loading">Loading subscription data...</div>;

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

      {/* Tier Cards Section */}
      <div className="detail-section">
        <h3>Subscription Tiers</h3>
        {tiers.length === 0 ? (
          <div className="empty-state">No tiers configured</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {tiers.map((tier) => (
              <div key={tier.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>{tier.name}</h4>
                  {isAdmin && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditTier(tier)}>Edit</button>
                  )}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
                  {tier.price != null ? `$${Number(tier.price).toFixed(2)}` : 'Free'}
                  {tier.price != null && <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-secondary)' }}>/mo</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  Access Level: <span className="badge badge--in_progress">{tier.access_level || '--'}</span>
                </div>
                {tier.description && (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '8px 0' }}>{tier.description}</p>
                )}
                {tier.features && (Array.isArray(tier.features) ? tier.features : []).length > 0 && (
                  <ul style={{ margin: '8px 0 0 0', padding: '0 0 0 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {(Array.isArray(tier.features) ? tier.features : []).map((f, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscriptions Table Section */}
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
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.artist_name || sub.artist_stage_name || sub.artist_id}</td>
                    <td>{sub.tier_name || sub.tier_id}</td>
                    <td>
                      <span className={`badge badge--${sub.status || 'active'}`}>
                        {(sub.status || 'active').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '--'}</td>
                    <td>{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : '--'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditSub(sub)}>Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <input value={tierForm.access_level} onChange={handleTierChange('access_level')} placeholder="e.g. basic, premium, vip" required />
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
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={subForm.status} onChange={handleSubChange('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
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
