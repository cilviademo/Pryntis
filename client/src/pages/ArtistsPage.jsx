import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../components/shared.css';

export default function ArtistsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const [artists, setArtists] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', stage_name: '', email: '', phone: '', bio: '', genre: '', status: 'active', notes: '' });

  const fetchArtists = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/artists?${params}`);
      setArtists(res);
      // Response includes pagination in the outer response — we parse from the raw fetch
      // For simplicity, we'll infer from the data
    } catch (err) {
      console.error('Failed to load artists:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', stage_name: '', email: '', phone: '', bio: '', genre: '', status: 'active', notes: '' });
    setShowForm(true);
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
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/artists/${editing.id}`, form);
      } else {
        await api.post('/artists', form);
      }
      setShowForm(false);
      fetchArtists();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h2>Artists</h2>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>Add Artist</button>}
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
      </div>

      {loading ? (
        <div className="loading">Loading artists...</div>
      ) : artists.length === 0 ? (
        <div className="empty-state">No artists found</div>
      ) : (
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
                  <td>{artist.stage_name || '—'}</td>
                  <td>{artist.genre || '—'}</td>
                  <td><span className={`status-badge status-badge--${artist.status}`}>{artist.status}</span></td>
                  <td>{artist.email || '—'}</td>
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
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Artist' : 'Add Artist'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Name *</label>
                  <input value={form.name} onChange={handleChange('name')} required />
                </div>
                <div className="form-group">
                  <label>Stage Name</label>
                  <input value={form.stage_name} onChange={handleChange('stage_name')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={handleChange('email')} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={form.phone} onChange={handleChange('phone')} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Genre</label>
                    <input value={form.genre} onChange={handleChange('genre')} />
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
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
