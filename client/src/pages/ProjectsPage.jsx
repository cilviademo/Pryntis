import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../components/shared.css';

export default function ProjectsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', artist_id: '', status: 'draft', start_date: '', target_completion_date: '',
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 50 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/projects?${params}`);
      setProjects(res);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', artist_id: '', status: 'draft', start_date: '', target_completion_date: '' });
    setShowForm(true);
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
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.artist_id) delete payload.artist_id;
      if (editing) {
        await api.put(`/projects/${editing.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h2>Projects</h2>
        {canEdit && <button className="btn btn-primary" onClick={openCreate}>Add Project</button>}
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
      </div>

      {loading ? (
        <div className="loading">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">No projects found</div>
      ) : (
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
                        {project.artist_stage_name || project.artist_name || '—'}
                      </Link>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${project.status}`}>
                      {project.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}</td>
                  <td>{project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : '—'}</td>
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
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit Project' : 'Add Project'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={form.title} onChange={handleChange('title')} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={handleChange('description')} />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={form.start_date} onChange={handleChange('start_date')} />
                  </div>
                  <div className="form-group">
                    <label>Target Completion</label>
                    <input type="date" value={form.target_completion_date} onChange={handleChange('target_completion_date')} />
                  </div>
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
