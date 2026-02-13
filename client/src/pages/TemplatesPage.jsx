import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const CATEGORIES = ['Sync License', 'Publishing', 'Distribution', 'Recording Agreement', 'Cue Sheet', 'Split Sheet', 'NDA', 'Other'];
const FILTER_OPTIONS = ['All', ...CATEGORIES];

export default function TemplatesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  // Detail modal
  const [selected, setSelected] = useState(null);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', body: '', source_url: '' });

  // Validation modal
  const [showValidation, setShowValidation] = useState(false);
  const [validationResults, setValidationResults] = useState([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search.trim()) params.set('q', search.trim());
      if (catFilter && catFilter !== 'All') params.set('category', catFilter);
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

  /* ---- Create / Edit ---- */
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
    setSelected(null);
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
        addToast('Template updated successfully', 'success');
      } else {
        await api.post('/templates', form);
        addToast('Template created successfully', 'success');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err) {
      setFormError(err.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Copy / Download / Use ---- */
  const copyToClipboard = (template) => {
    navigator.clipboard.writeText(template.body).then(() => {
      addToast('Content copied to clipboard', 'success');
    }).catch(() => {
      addToast('Failed to copy to clipboard', 'error');
    });
  };

  const downloadAsText = (template) => {
    const blob = new Blob([template.body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (template.title || 'template').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('File downloaded', 'success');
  };

  const useTemplate = () => {
    addToast('Template applied to workspace', 'success');
  };

  /* ---- Validate All ---- */
  const runValidateAll = () => {
    const results = templates.map((t) => {
      const issues = [];
      if (!t.body || t.body.length <= 50) issues.push('Content is missing or too short (must be > 50 characters)');
      if (!t.category) issues.push('Category is missing');
      if (t.verification_status !== 'verified') issues.push('Template is not verified');
      if (!t.last_verified_at) issues.push('Last verified date is missing');
      return {
        id: t.id,
        title: t.title,
        passed: issues.length === 0,
        issues,
      };
    });
    setValidationResults(results);
    setShowValidation(true);
  };

  /* ---- Helpers ---- */
  const getPreviewLines = (body) => {
    if (!body) return '';
    const lines = body.split('\n').filter((l) => l.trim() !== '');
    return lines.slice(0, 3).join('\n');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const totalPages = Math.ceil(total / limit);
  const passedCount = validationResults.filter((r) => r.passed).length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h2>Templates & SOPs</h2>
        <div className="flex gap-8">
          {isAdmin && (
            <button className="btn btn-secondary" onClick={runValidateAll} disabled={loading || templates.length === 0}>
              Validate All
            </button>
          )}
          {canEdit && <button className="btn btn-primary" onClick={openCreate}>Add Template</button>}
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="filter-bar">
        <input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {FILTER_OPTIONS.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
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
          {/* Template Card Grid */}
          <div className="card-grid card-grid--wide">
            {templates.map((t) => (
              <div
                key={t.id}
                className="card card--compact cursor-pointer"
                onClick={() => setSelected(t)}
              >
                <div className="card-header">
                  <h4 style={{ margin: 0, flex: 1 }}>{t.title}</h4>
                  <span className="badge badge--active">{t.category}</span>
                </div>
                <pre className="text-sm text-secondary line-clamp-3 mb-8" style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  background: 'none',
                  padding: 0,
                  border: 'none',
                }}>{getPreviewLines(t.body)}</pre>
                <div className="flex justify-between items-center mt-8 text-xs text-muted">
                  <span>
                    {t.verification_status === 'verified' ? (
                      <span className="text-success">Verified</span>
                    ) : (
                      <span className="text-warning">Unverified</span>
                    )}
                    {t.last_verified_at && (
                      <span className="text-muted" style={{ marginLeft: 6 }}>{formatDate(t.last_verified_at)}</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination mt-24">
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

      {/* ============================== */}
      {/* Detail / Preview Modal         */}
      {/* ============================== */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="card-header mb-16">
              <div>
                <h3 style={{ margin: 0 }}>{selected.title}</h3>
                <div className="flex gap-8 mt-8">
                  <span className="badge badge--active">{selected.category}</span>
                  {selected.verification_status === 'verified' && (
                    <span className="badge badge--completed">Verified</span>
                  )}
                </div>
              </div>
            </div>

            <pre className="template-preview">{selected.body}</pre>

            {selected.last_verified_at && (
              <div className="mt-8 text-xs text-secondary">
                Last verified: {formatDate(selected.last_verified_at)}
              </div>
            )}
            {selected.source_url && (
              <div className="mt-8 text-xs text-secondary">
                Source: <code>{selected.source_url}</code>
              </div>
            )}

            <div className="modal-actions mt-16">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-secondary" onClick={() => copyToClipboard(selected)}>Copy to Clipboard</button>
              <button className="btn btn-secondary" onClick={() => downloadAsText(selected)}>Download as Text</button>
              <button className="btn btn-primary" onClick={useTemplate}>Use Template</button>
              {canEdit && (
                <button className="btn btn-secondary" onClick={() => openEdit(selected)}>Edit</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Validation Results Modal        */}
      {/* ============================== */}
      {showValidation && (
        <div className="modal-overlay" onClick={() => setShowValidation(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <h3>Template Validation Results</h3>
            <p className="text-sm mb-16">
              {passedCount} of {validationResults.length} templates passed validation
            </p>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {validationResults.map((r) => (
                <div key={r.id} style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}>
                  <span className={r.passed ? 'text-success font-bold' : 'text-danger font-bold'}
                    style={{ flexShrink: 0, fontSize: 16, lineHeight: '20px', width: 20, textAlign: 'center' }}>
                    {r.passed ? '[OK]' : '[X]'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span className="text-sm font-semibold">{r.title}</span>
                    {!r.passed && r.issues.map((issue, i) => (
                      <div key={i} className="text-xs text-danger" style={{ marginTop: 2 }}>{issue}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowValidation(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Create / Edit Modal             */}
      {/* ============================== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
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
