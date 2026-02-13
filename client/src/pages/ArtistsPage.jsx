import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDebounce from '../utils/useDebounce';
import api from '../services/api';

const GENRES = ['Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'Afrobeats', 'Other'];

export default function ArtistsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', stage_name: '', email: '', phone: '', bio: '', genre: '', status: 'active', notes: '',
  });

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (genreFilter) params.set('genre', genreFilter);
      const res = await api.get(`/artists?${params}`);
      const data = Array.isArray(res) ? res : [];
      setArtists(data);
      setResultCount(data.length);
    } catch (err) {
      setError('Failed to load artists');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, genreFilter, page]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, genreFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', stage_name: '', email: '', phone: '', bio: '', genre: '', status: 'active', notes: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (artist) => {
    setEditing(artist);
    setForm({
      name: artist.name || '',
      stage_name: artist.stage_name || '',
      email: artist.email || '',
      phone: artist.phone || '',
      bio: artist.bio || '',
      genre: artist.genre || '',
      status: artist.status || 'active',
      notes: artist.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/artists/${editing.id}`, form);
        addToast('Artist updated successfully');
      } else {
        await api.post('/artists', form);
        addToast('Artist created successfully');
      }
      setShowModal(false);
      fetchArtists();
    } catch (err) {
      setFormError(err.message || 'Failed to save artist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Artists</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>Add Artist</button>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search artists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
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
        <div className="loading">Loading artists...</div>
      ) : artists.length === 0 ? (
        <div className="empty-state">No artists found</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stage Name</th>
                  <th>Genre</th>
                  <th>Status</th>
                  <th>Email</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {artists.map((artist) => (
                  <tr key={artist.id}>
                    <td><Link to={`/artists/${artist.id}`}>{artist.name}</Link></td>
                    <td>{artist.stage_name || '--'}</td>
                    <td>{artist.genre || '--'}</td>
                    <td>
                      <span className={`badge badge--${artist.status}`}>
                        {(artist.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{artist.email || '--'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(artist)}>Edit</button>
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
              <span className="mx-12">Page {page}</span>
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
            <h3>{editing ? 'Edit Artist' : 'Add Artist'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && <div className="form-error mb-16">{formError}</div>}
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={handleChange('name')} required />
              </div>
              <div className="form-group">
                <label>Stage Name</label>
                <input value={form.stage_name} onChange={handleChange('stage_name')} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={handleChange('email')} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={handleChange('phone')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Genre</label>
                  <select value={form.genre} onChange={handleChange('genre')}>
                    <option value="">Select Genre</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={handleChange('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea rows={3} value={form.bio} onChange={handleChange('bio')} />
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
