import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PIPELINE_STATUSES = ['pending', 'confirmed', 'completed', 'declined'];

export default function PlacementsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const limit = 30;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    asset_id: '', platform: '', placement_type: '', status: 'pending',
    fee: '', placed_date: '', notes: '',
  });

  const fetchPlacements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/placements?${params}`);
      const data = Array.isArray(res) ? res : [];
      setPlacements(data);
      setResultCount(data.length);
    } catch (err) {
      setError('Failed to load placements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      asset_id: '', platform: '', placement_type: '', status: 'pending',
      fee: '', placed_date: '', notes: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (placement) => {
    setEditing(placement);
    setForm({
      asset_id: placement.asset_id || '',
      platform: placement.platform || '',
      placement_type: placement.placement_type || '',
      status: placement.status || 'pending',
      fee: placement.fee != null ? String(placement.fee) : '',
      placed_date: placement.placed_date ? placement.placed_date.split('T')[0] : '',
      notes: placement.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_id.trim()) {
      setFormError('Asset ID is required');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.fee) payload.fee = parseFloat(payload.fee);
      else delete payload.fee;
      if (!payload.placed_date) delete payload.placed_date;
      if (!payload.notes) delete payload.notes;

      if (editing) {
        await api.put(`/placements/${editing.id}`, payload);
      } else {
        await api.post('/placements', payload);
      }
      setShowModal(false);
      fetchPlacements();
    } catch (err) {
      setFormError(err.message || 'Failed to save placement');
    } finally {
      setSubmitting(false);
    }
  };

  // Group placements by status for pipeline view
  const pipelineGroups = {};
  PIPELINE_STATUSES.forEach((s) => { pipelineGroups[s] = []; });
  placements.forEach((p) => {
    const status = p.status || 'pending';
    if (pipelineGroups[status]) {
      pipelineGroups[status].push(p);
    } else {
      pipelineGroups.pending.push(p);
    }
  });

  return (
    <div>
      <div className="page-header">
        <h2>Placements</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>Add Placement</button>
        )}
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('table')}
        >
          Table View
        </button>
        <button
          className={`btn btn-sm ${viewMode === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('pipeline')}
        >
          Pipeline View
        </button>
      </div>

      {viewMode === 'table' && (
        <div className="filter-bar">
          <input
            placeholder="Search placements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading placements...</div>
      ) : viewMode === 'table' ? (
        /* Table View */
        placements.length === 0 ? (
          <div className="empty-state">No placements found</div>
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Platform</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Fee</th>
                    <th>Placed Date</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.asset_id ? (
                          <Link to={`/assets/${p.asset_id}`}>{p.asset_title || 'View Asset'}</Link>
                        ) : '--'}
                      </td>
                      <td>{p.platform || '--'}</td>
                      <td>{p.placement_type || '--'}</td>
                      <td>
                        <span className={`badge badge--${p.status}`}>
                          {(p.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{p.fee != null ? `$${Number(p.fee).toLocaleString()}` : '--'}</td>
                      <td>{p.placed_date ? new Date(p.placed_date).toLocaleDateString() : '--'}</td>
                      {canEdit && (
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Showing {resultCount} results</span>
              <div>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((pg) => pg - 1)}
                >
                  Previous
                </button>
                <span style={{ margin: '0 12px' }}>Page {page}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={resultCount < limit}
                  onClick={() => setPage((pg) => pg + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )
      ) : (
        /* Pipeline View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', minHeight: '400px' }}>
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'capitalize' }}>{status}</h4>
                <span className={`badge badge--${status}`}>{pipelineGroups[status].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                {pipelineGroups[status].length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px 0' }}>
                    No placements
                  </div>
                ) : (
                  pipelineGroups[status].map((p) => (
                    <div
                      key={p.id}
                      className="card"
                      style={{ padding: '12px', cursor: canEdit ? 'pointer' : 'default' }}
                      onClick={() => canEdit && openEdit(p)}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                        {p.asset_title || 'Untitled Asset'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {p.platform || 'No platform'}
                      </div>
                      {p.fee != null && (
                        <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 600 }}>
                          ${Number(p.fee).toLocaleString()}
                        </div>
                      )}
                      {p.placed_date && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          {new Date(p.placed_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Placement' : 'Add Placement'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && <div className="login-error" style={{ marginBottom: '16px' }}>{formError}</div>}
              <div className="form-group">
                <label>Asset ID *</label>
                <input value={form.asset_id} onChange={handleChange('asset_id')} placeholder="Asset UUID" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Platform</label>
                  <input value={form.platform} onChange={handleChange('platform')} placeholder="e.g. Spotify, Film, TV" />
                </div>
                <div className="form-group">
                  <label>Placement Type</label>
                  <input value={form.placement_type} onChange={handleChange('placement_type')} placeholder="e.g. sync, license" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={handleChange('status')}>
                    {PIPELINE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fee</label>
                  <input type="number" step="0.01" min="0" value={form.fee} onChange={handleChange('fee')} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label>Placed Date</label>
                <input type="date" value={form.placed_date} onChange={handleChange('placed_date')} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={handleChange('notes')} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
