import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

export default function TasksPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager';

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', status: 'open',
    assigned_to: '', due_date: '', artist_id: '',
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (assignedFilter) params.set('assigned_to', assignedFilter);
      const res = await api.get(`/tasks?${params}`);
      const data = Array.isArray(res) ? res : [];
      setTasks(data);
      setResultCount(data.length);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, assignedFilter, page]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, assignedFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', priority: 'medium', status: 'open', assigned_to: '', due_date: '', artist_id: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'open',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      artist_id: task.artist_id || '',
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
      if (!payload.assigned_to) delete payload.assigned_to;
      if (!payload.due_date) delete payload.due_date;
      if (!payload.artist_id) delete payload.artist_id;
      if (!payload.description) delete payload.description;

      if (editing) {
        await api.put(`/tasks/${editing.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      setFormError(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Tasks</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>Add Task</button>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <input
          placeholder="Assigned to (user ID)..."
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      </div>

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">No tasks found</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Assigned To</th>
                  <th>Artist</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="clickable-row" onClick={() => setSelectedTask(task)}>
                    <td className="font-semibold">{task.title}</td>
                    <td>
                      <span className={`badge badge--${task.priority || 'medium'}`}>
                        {task.priority || 'medium'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge--${task.status || 'open'}`}>
                        {(task.status || 'open').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: isOverdue(task.due_date) && task.status !== 'completed' ? 'var(--color-danger, #ef4444)' : 'inherit' }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '--'}
                      {isOverdue(task.due_date) && task.status !== 'completed' && ' (overdue)'}
                    </td>
                    <td>{task.assigned_to_name || task.assigned_to || '--'}</td>
                    <td>{task.artist_name || task.artist_id || '--'}</td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(task)}>Edit</button>
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
            <h3>{editing ? 'Edit Task' : 'Add Task'}</h3>
            <form onSubmit={handleSubmit}>
              {formError && <div className="login-error" style={{ marginBottom: '16px' }}>{formError}</div>}
              <div className="form-group">
                <label>Title *</label>
                <input value={form.title} onChange={handleChange('title')} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={handleChange('description')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={handleChange('priority')}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={handleChange('status')}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.due_date} onChange={handleChange('due_date')} />
                </div>
                <div className="form-group">
                  <label>Assigned To (user ID)</label>
                  <input value={form.assigned_to} onChange={handleChange('assigned_to')} placeholder="User UUID" />
                </div>
              </div>
              <div className="form-group">
                <label>Artist ID</label>
                <input value={form.artist_id} onChange={handleChange('artist_id')} placeholder="Related artist UUID (optional)" />
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

      {selectedTask && (
        <div className="drawer-overlay" onClick={() => setSelectedTask(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3 style={{ margin: 0 }}>{selectedTask.title}</h3>
              <button className="drawer-close" onClick={() => setSelectedTask(null)}>x</button>
            </div>

            <div className="grid-2 mb-16">
              <div>
                <div className="text-xs text-muted mb-4">Priority</div>
                <span className={`badge badge--${selectedTask.priority || 'medium'}`}>
                  {(selectedTask.priority || 'medium').replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Status</div>
                <span className={`badge badge--${selectedTask.status || 'open'}`}>
                  {(selectedTask.status || 'open').replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Due Date</div>
                <span>{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'Not set'}</span>
              </div>
              <div>
                <div className="text-xs text-muted mb-4">Assigned To</div>
                <span>{selectedTask.assigned_to_name || selectedTask.assigned_to || 'Unassigned'}</span>
              </div>
            </div>

            {selectedTask.description && (
              <div className="mb-16">
                <div className="text-xs text-muted mb-4">Description</div>
                <p className="text-sm">{selectedTask.description}</p>
              </div>
            )}

            {selectedTask.artist_name && (
              <div className="mb-16">
                <div className="text-xs text-muted mb-4">Related Artist</div>
                <span className="font-semibold">{selectedTask.artist_name}</span>
              </div>
            )}

            <div className="text-xs text-muted">
              Created: {selectedTask.created_at ? new Date(selectedTask.created_at).toLocaleString() : '--'}
            </div>

            {canEdit && (
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => { setSelectedTask(null); openEdit(selectedTask); }}>
                  Edit Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
