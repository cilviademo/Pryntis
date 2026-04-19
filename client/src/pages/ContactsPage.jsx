import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import useEscapeKey from '../utils/useEscapeKey';
import api from '../services/api';
import ExportButton from '../components/ExportButton';
import { maskEmail, maskPhone } from '../utils/pii';

const ROLE_OPTIONS = ['Lawyer', 'Publisher', 'A&R', 'Music Supervisor', 'Manager', 'Producer', 'Distributor', 'Other'];

export default function ContactsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  const [showModal, setShowModal] = useState(false);
  useEscapeKey(() => setShowModal(false), showModal);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', organization: '', role: '', email: '', phone: '', notes: '', tags: '', relationship_strength: '',
  });

  // Detail drawer
  const [selected, setSelected] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search.trim()) params.set('q', search.trim());
      if (typeFilter) params.set('type', typeFilter);
      const res = await api.getFullResponse('GET', `/contacts?${params}`);
      setContacts(Array.isArray(res.data) ? res.data : []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', organization: '', role: '', email: '', phone: '', notes: '', tags: '', relationship_strength: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      organization: c.organization || '',
      role: c.role || '',
      email: c.email || '',
      phone: c.phone || '',
      notes: c.notes || '',
      tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
      relationship_strength: c.relationship_strength != null ? String(c.relationship_strength) : '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? `{${form.tags.split(',').map((t) => t.trim()).filter(Boolean).join(',')}}` : '{}',
        relationship_strength: form.relationship_strength ? parseInt(form.relationship_strength, 10) : null,
      };
      if (editing) {
        await api.put(`/contacts/${editing.id}`, payload);
      } else {
        await api.post('/contacts', payload);
      }
      setShowModal(false);
      fetchContacts();
    } catch (err) {
      setFormError(err.message || 'Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const strengthLabels = { 1: 'Cold', 2: 'Warm', 3: 'Good', 4: 'Strong', 5: 'Key Partner' };

  return (
    <div>
      <div className="page-header">
        <h2>Contacts</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ExportButton entity="contacts" />
          {canEdit && <button className="btn btn-primary" onClick={openCreate}>Add Contact</button>}
        </div>
      </div>

      <div className="filter-bar">
        <input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="filter-count">{total} contact{total !== 1 ? 's' : ''}</span>
      </div>

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">No contacts found</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Strength</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="clickable-row" onClick={() => setSelected(c)}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.organization || '--'}</td>
                    <td><span className="badge badge--active">{c.role || '--'}</span></td>
                    <td>{c.email ? maskEmail(c.email) : '--'}</td>
                    <td>{c.phone ? maskPhone(c.phone) : '--'}</td>
                    <td>
                      {c.relationship_strength ? (
                        <span className={`badge badge--${c.relationship_strength >= 4 ? 'completed' : c.relationship_strength >= 2 ? 'pending' : 'declined'}`}>
                          {strengthLabels[c.relationship_strength] || c.relationship_strength}
                        </span>
                      ) : '--'}
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Page {page} of {totalPages} ({total} total)</span>
              <div className="pagination-buttons">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className="page-current">{page}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3>{selected.name}</h3>
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div><strong>Organization:</strong> {selected.organization || '--'}</div>
              <div><strong>Role:</strong> {selected.role || '--'}</div>
              <div><strong>Email:</strong> {selected.email ? maskEmail(selected.email) : '--'}</div>
              <div><strong>Phone:</strong> {selected.phone ? maskPhone(selected.phone) : '--'}</div>
              <div><strong>Strength:</strong> {selected.relationship_strength ? strengthLabels[selected.relationship_strength] : '--'}</div>
              <div><strong>Tags:</strong> {Array.isArray(selected.tags) && selected.tags.length > 0 ? selected.tags.join(', ') : '--'}</div>
            </div>
            {selected.notes && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Notes:</strong>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>{selected.notes}</p>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {canEdit && <button className="btn btn-primary" onClick={() => { setSelected(null); openEdit(selected); }}>Edit</button>}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Contact' : 'Add Contact'}</h3>
            <form onSubmit={handleSubmit} className="form-stack">
              {formError && <div className="form-error">{formError}</div>}
              <div className="form-group">
                <label>Name *</label>
                <input value={form.name} onChange={handleChange('name')} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Organization</label>
                  <input value={form.organization} onChange={handleChange('organization')} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={handleChange('role')}>
                    <option value="">Select Role</option>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
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
                  <label>Relationship Strength (1-5)</label>
                  <select value={form.relationship_strength} onChange={handleChange('relationship_strength')}>
                    <option value="">Select</option>
                    <option value="1">1 - Cold</option>
                    <option value="2">2 - Warm</option>
                    <option value="3">3 - Good</option>
                    <option value="4">4 - Strong</option>
                    <option value="5">5 - Key Partner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input value={form.tags} onChange={handleChange('tags')} placeholder="sync, publishing" />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows={3} value={form.notes} onChange={handleChange('notes')} />
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
