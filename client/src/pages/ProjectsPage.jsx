import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDebounce from '../utils/useDebounce';
import api from '../services/api';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', artist_id: '', status: 'draft',
    start_date: '', target_completion_date: '',
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit, sort: sortBy });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/projects?${params}`);
      const data = Array.isArray(res) ? res : [];
      setProjects(data);
      setResultCount(data.length);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sortBy]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', artist_id: '', status: 'draft', start_date: '', target_completion_date: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({
      title: project.title || '',
      description: project.description || '',
      artist_id: project.artist_id || '',
      status: project.status || 'draft',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      target_completion_date: project.target_completion_date ? project.target_completion_date.split('T')[0] : '',
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
      if (!payload.start_date) delete payload.start_date;
      if (!payload.target_completion_date) delete payload.target_completion_date;
      if (editing) {
        await api.put(`/projects/${editing.id}`, payload);
        addToast('Project updated successfully');
      } else {
        await api.post('/projects', payload);
        addToast('Project created successfully');
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      setFormError(err.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Projects</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>Add Project</button>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="updated_at">Recently Updated</option>
          <option value="created_at">Recently Created</option>
          <option value="title">Title A-Z</option>
          <option value="start_date">Start Date</option>
        </select>
      </div>

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">No projects found</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Artist</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Target</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><Link to={`/projects/${project.id}`}>{project.title}</Link></td>
                    <td>
                      {project.artist_id ? (
                        <Link to={`/artists/${project.artist_id}`}>
                          {project.artist_stage_name || project.artist_name || '--'}
                        </Link>
                      ) : '--'}
                    </td>
                    <td>
                      <span className={`badge badge--${project.status}`}>
                        {(project.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '--'}</td>
                    <td>{project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : '--'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(project)}>Edit</button>
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
            <h3>{editing ? 'Edit Project' : 'Add Project'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && <div className="form-error mb-16">{formError}</div>}
              <div className="form-group">
                <label>Title *</label>
                <input value={form.title} onChange={handleChange('title')} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={handleChange('description')} />
              </div>
              <div className="form-group">
                <label>Artist ID</label>
                <input value={form.artist_id} onChange={handleChange('artist_id')} placeholder="UUID of primary artist" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={handleChange('status')}>
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={handleChange('start_date')} />
                </div>
                <div className="form-group">
                  <label>Target Completion</label>
                  <input type="date" value={form.target_completion_date} onChange={handleChange('target_completion_date')} />
                </div>
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
