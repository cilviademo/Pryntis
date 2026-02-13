import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CATEGORIES = ['Sync License', 'Publishing', 'Distribution', 'Recording Agreement', 'Cue Sheet', 'Split Sheet', 'NDA', 'Other'];

export default function TemplatesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', body: '', source_url: '' });

  const [validating, setValidating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search.trim()) params.set('q', search.trim());
      if (catFilter) params.set('category', catFilter);
      const res = await api.getFullResponse('GET', `/templates?${params}`);
      setTemplates(Array.isArray(res.data) ? res.data : []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, page]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { setPage(1); }, [search, catFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', category: '', body: '', source_url: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ title: t.title || '', category: t.category || '', body: t.body || '', source_url: t.source_url || '' });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category || !form.body.trim()) {
      setFormError('Title, category, and body are required');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/templates/${editing.id}`, form);
      } else {
        await api.post('/templates', form);
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      setFormError(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      await api.post('/templates/validate', {});
      fetchTemplates();
    } catch (err) {
      console.error(err);
    } finally {
      setValidating(false);
    }
  };

  const copyBody = (template) => {
    navigator.clipboard.writeText(template.body).then(() => {
      setCopied(template.id);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <h2>Templates & SOPs</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={runValidation} disabled={validating}>
              {validating ? 'Validating...' : 'Validate All'}
            </button>
          )}
          {canEdit && <button className="btn btn-primary" onClick={openCreate}>Add Template</button>}
        </div>
      </div>

      <div className="filter-bar">
        <input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="filter-count">{total} template{total !== 1 ? 's' : ''}</span>
      </div>

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">No templates found</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {templates.map((t) => (
              <div key={t.id} className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setSelected(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px' }}>{t.title}</h4>
                  <span className="badge badge--active">{t.category}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '8px 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {t.body}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  <span>
                    {t.verification_status === 'verified' ? (
                      <span style={{ color: 'var(--color-success)' }}>Verified {t.last_verified_at ? new Date(t.last_verified_at).toLocaleDateString() : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--color-warning)' }}>Unverified</span>
                    )}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); copyBody(t); }}>
                    {copied === t.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '24px' }}>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <div className="pagination-buttons">
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className="page-current">{page}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail / Preview Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selected.title}</h3>
                <span className="badge badge--active" style={{ marginTop: '8px' }}>{selected.category}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => copyBody(selected)}>
                {copied === selected.id ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--color-text)', background: 'var(--color-bg)', padding: '16px', borderRadius: 'var(--radius)', maxHeight: '400px', overflow: 'auto', lineHeight: '1.6' }}>
              {selected.body}
            </pre>
            {selected.source_url && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Source: <code>{selected.source_url}</code>
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {canEdit && <button className="btn btn-primary" onClick={() => { setSelected(null); openEdit(selected); }}>Edit</button>}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <h3>{editing ? 'Edit Template' : 'Add Template'}</h3>
            <form onSubmit={handleSubmit} className="form-stack">
              {formError && <div className="form-error">{formError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input value={form.title} onChange={handleChange('title')} required />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={form.category} onChange={handleChange('category')} required>
                    <option value="">Select Category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Body *</label>
                <textarea rows={12} value={form.body} onChange={handleChange('body')} required style={{ fontFamily: 'monospace', fontSize: '13px' }} />
              </div>
              <div className="form-group">
                <label>Source URL (optional)</label>
                <input value={form.source_url} onChange={handleChange('source_url')} placeholder="https://..." />
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
