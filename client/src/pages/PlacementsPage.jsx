import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useEscapeKey from '../utils/useEscapeKey';
import api from '../services/api';

const PIPELINE_STATUSES = ['pending', 'confirmed', 'completed', 'declined'];

export default function PlacementsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  const [placements, setPlacements] = useState([]);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  useEscapeKey(() => { if (showModal) setShowModal(false); else if (selectedPlacement) setSelectedPlacement(null); }, showModal || !!selectedPlacement);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    asset_id: '', placed_with: '', placement_type: '', status: 'pending',
    expected_value: '', placement_date: '', notes: '',
  });

  const fetchPlacements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.getFullResponse('GET', `/port/placements?${params}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setPlacements(data);
      setTotal(res.pagination?.total || data.length);
    } catch (err) {
      setError('Failed to load placements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      asset_id: '', placed_with: '', placement_type: '', status: 'pending',
      expected_value: '', placement_date: '', notes: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (placement) => {
    setEditing(placement);
    setForm({
      asset_id: placement.asset_id || '',
      placed_with: placement.placed_with || '',
      placement_type: placement.placement_type || '',
      status: placement.status || 'pending',
      expected_value: placement.expected_value != null ? String(placement.expected_value) : '',
      placement_date: placement.placement_date ? placement.placement_date.split('T')[0] : '',
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
      if (payload.expected_value) payload.expected_value = parseFloat(payload.expected_value);
      else delete payload.expected_value;
      if (!payload.placement_date) delete payload.placement_date;
      if (!payload.placed_with) delete payload.placed_with;
      if (!payload.notes) delete payload.notes;

      if (editing) {
        await api.put(`/port/placements/${editing.id}`, payload);
      } else {
        await api.post('/port/placements', payload);
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <h2>Placements</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="export-btn"
            onClick={async () => {
              try {
                const response = await fetch('/api/v1/export/placements', {
                  headers: { 'Authorization': `Bearer ${api.getToken()}` },
                });
                if (!response.ok) return;
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pryntis-placements-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) { console.error('Export failed:', err); }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={openCreate}>Add Placement</button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-8 mb-16">
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <span className="filter-count">{total} placement{total !== 1 ? 's' : ''}</span>
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
                    <th>Placed With</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Date</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {placements.map((p) => (
                    <tr key={p.id} className="clickable-row" onClick={() => setSelectedPlacement(p)}>
                      <td>
                        {p.asset_id ? (
                          <Link to={`/port/assets/${p.asset_id}`}>{p.asset_title || 'View Asset'}</Link>
                        ) : '--'}
                      </td>
                      <td>{p.placed_with || '--'}</td>
                      <td className="capitalize">{p.placement_type || '--'}</td>
                      <td>
                        <span className={`badge badge--${p.status}`}>
                          {(p.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </td>
                      <td>{p.expected_value != null ? `$${Number(p.expected_value).toLocaleString()}` : '--'}</td>
                      <td>{p.placement_date ? new Date(p.placement_date).toLocaleDateString() : '--'}</td>
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
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="pagination-buttons">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((pg) => pg - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-current">{page}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((pg) => pg + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        /* Pipeline View */
        <div className="pipeline-grid">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="pipeline-column">
              <div className="pipeline-column__header">
                <h4 className="text-sm capitalize" style={{ margin: 0 }}>{status}</h4>
                <span className={`badge badge--${status}`}>{pipelineGroups[status].length}</span>
              </div>
              <div className="pipeline-column__cards">
                {pipelineGroups[status].length === 0 ? (
                  <div className="pipeline-empty">No placements</div>
                ) : (
                  pipelineGroups[status].map((p) => (
                    <div
                      key={p.id}
                      className="card"
                      style={{ cursor: canEdit ? 'pointer' : 'default' }}
                      onClick={() => canEdit && openEdit(p)}
                    >
                      <div className="pipeline-card-title">{p.asset_title || 'Untitled Asset'}</div>
                      <div className="pipeline-card-sub">{p.placed_with || 'No platform'}</div>
                      {p.expected_value != null && Number(p.expected_value) > 0 && (
                        <div className="pipeline-card-value">${Number(p.expected_value).toLocaleString()}</div>
                      )}
                      {p.placement_date && (
                        <div className="pipeline-card-date">{new Date(p.placement_date).toLocaleDateString()}</div>
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
            <form onSubmit={handleSubmit} className="form-stack">
              {formError && <div className="form-error">{formError}</div>}
              <div className="form-group">
                <label>Asset ID *</label>
                <input value={form.asset_id} onChange={handleChange('asset_id')} placeholder="Asset UUID" required />
              </div>
              <div className="form-group">
                <label>Placed With</label>
                <input value={form.placed_with} onChange={handleChange('placed_with')} placeholder="e.g. Netflix, Nike, Spotify" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Placement Type</label>
                  <select value={form.placement_type} onChange={handleChange('placement_type')}>
                    <option value="">Select Type</option>
                    <option value="sync">Sync</option>
                    <option value="license">License</option>
                    <option value="feature">Feature</option>
                    <option value="release">Release</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={handleChange('status')}>
                    {PIPELINE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Expected Value ($)</label>
                  <input type="number" step="0.01" min="0" value={form.expected_value} onChange={handleChange('expected_value')} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Placement Date</label>
                  <input type="date" value={form.placement_date} onChange={handleChange('placement_date')} />
                </div>
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

      {selectedPlacement && (
        <div className="drawer-overlay" onClick={() => setSelectedPlacement(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>Placement Details</h3>
              <button className="drawer-close" onClick={() => setSelectedPlacement(null)}>x</button>
            </div>

            <div className="mb-16">
              <div className="text-xs text-muted mb-4">Asset</div>
              <div className="font-semibold">
                {selectedPlacement.asset_id ? (
                  <Link to={`/port/assets/${selectedPlacement.asset_id}`}>{selectedPlacement.asset_title || 'View Asset'}</Link>
                ) : '--'}
              </div>
            </div>

            <div className="grid-2 mb-16">
              <div>
                <div className="text-xs text-muted mb-4">Placed With</div>
                <span className="font-semibold">{selectedPlacement.placed_with || '--'}</span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Type</div>
                <span className="badge badge--active capitalize">{selectedPlacement.placement_type || '--'}</span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Status</div>
                <span className={`badge badge--${selectedPlacement.status}`}>
                  {(selectedPlacement.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Expected Value</div>
                <span className="font-semibold">
                  {selectedPlacement.expected_value != null ? `$${Number(selectedPlacement.expected_value).toLocaleString()}` : '--'}
                </span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Placement Date</div>
                <span>{selectedPlacement.placement_date ? new Date(selectedPlacement.placement_date).toLocaleDateString() : '--'}</span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Expiry Date</div>
                <span>{selectedPlacement.expiry_date ? new Date(selectedPlacement.expiry_date).toLocaleDateString() : 'No expiry'}</span>
              </div>
            </div>

            {selectedPlacement.notes && (
              <div className="mb-16">
                <div className="text-xs text-muted mb-4">Notes</div>
                <p className="text-sm">{selectedPlacement.notes}</p>
              </div>
            )}

            {canEdit && (
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => { setSelectedPlacement(null); openEdit(selectedPlacement); }}>
                  Edit Placement
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
