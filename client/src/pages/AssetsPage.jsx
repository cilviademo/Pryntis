import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const FILE_TYPES = ['recording', 'composition', 'master', 'sync', 'sample', 'stem', 'other'];
const GENRES = ['Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'Afrobeats', 'Other'];

export default function AssetsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', file_type: '', genre: '', artist_id: '', project_id: '',
    bpm: '', key_signature: '', duration: '', external_url: '', description: '',
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('q', search);
      if (typeFilter) params.set('file_type', typeFilter);
      if (genreFilter) params.set('genre', genreFilter);
      const res = await api.get(`/port/assets?${params}`);
      const data = Array.isArray(res) ? res : [];
      setAssets(data);
      setResultCount(data.length);
    } catch (err) {
      setError('Failed to load assets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, genreFilter, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, genreFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', file_type: '', genre: '', artist_id: '', project_id: '',
      bpm: '', key_signature: '', duration: '', external_url: '', description: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (asset) => {
    setEditing(asset);
    setForm({
      title: asset.title || '',
      file_type: asset.file_type || '',
      genre: asset.genre || '',
      artist_id: asset.artist_id || '',
      project_id: asset.project_id || '',
      bpm: asset.bpm != null ? String(asset.bpm) : '',
      key_signature: asset.key_signature || '',
      duration: asset.duration != null ? String(asset.duration) : '',
      external_url: asset.external_url || '',
      description: asset.description || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.artist_id) delete payload.artist_id;
      if (!payload.project_id) delete payload.project_id;
      if (payload.bpm) payload.bpm = parseInt(payload.bpm, 10);
      else delete payload.bpm;
      if (payload.duration) payload.duration = parseInt(payload.duration, 10);
      else delete payload.duration;
      if (!payload.external_url) delete payload.external_url;

      if (editing) {
        await api.put(`/port/assets/${editing.id}`, payload);
      } else {
        await api.post('/port/assets', payload);
      }
      setShowModal(false);
      fetchAssets();
    } catch (err) {
      setFormError(err.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Assets</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>Add Asset</button>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {FILE_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
          <option value="">All Genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="empty-state">No assets found</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Genre</th>
                  <th>Artist</th>
                  <th>BPM</th>
                  <th>Key</th>
                  <th>Duration</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td><Link to={`/port/assets/${asset.id}`}>{asset.title}</Link></td>
                    <td>
                      <span className={`badge badge--${asset.file_type || 'unknown'}`}>
                        {asset.file_type || '--'}
                      </span>
                    </td>
                    <td>{asset.genre || '--'}</td>
                    <td>
                      {asset.artist_id ? (
                        <Link to={`/artists/${asset.artist_id}`}>
                          {asset.artist_stage_name || asset.artist_name || 'View'}
                        </Link>
                      ) : '--'}
                    </td>
                    <td>{asset.bpm || '--'}</td>
                    <td>{asset.key_signature || '--'}</td>
                    <td>{formatDuration(asset.duration)}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(asset)}>Edit</button>
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
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={{ margin: '0 12px' }}>Page {page}</span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={resultCount < limit}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Asset' : 'Add Asset'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && <div className="login-error" style={{ marginBottom: '16px' }}>{formError}</div>}
              <div className="form-group">
                <label>Title *</label>
                <input value={form.title} onChange={handleChange('title')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>File Type</label>
                  <select value={form.file_type} onChange={handleChange('file_type')}>
                    <option value="">Select Type</option>
                    {FILE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <select value={form.genre} onChange={handleChange('genre')}>
                    <option value="">Select Genre</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>BPM</label>
                  <input type="number" min="1" max="300" value={form.bpm} onChange={handleChange('bpm')} />
                </div>
                <div className="form-group">
                  <label>Key</label>
                  <input value={form.key_signature} onChange={handleChange('key_signature')} placeholder="e.g. C minor" />
                </div>
                <div className="form-group">
                  <label>Duration (seconds)</label>
                  <input type="number" min="0" value={form.duration} onChange={handleChange('duration')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Artist ID</label>
                  <input value={form.artist_id} onChange={handleChange('artist_id')} placeholder="UUID" />
                </div>
                <div className="form-group">
                  <label>Project ID</label>
                  <input value={form.project_id} onChange={handleChange('project_id')} placeholder="UUID" />
                </div>
              </div>
              <div className="form-group">
                <label>External URL</label>
                <input type="url" value={form.external_url} onChange={handleChange('external_url')} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={handleChange('description')} />
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
