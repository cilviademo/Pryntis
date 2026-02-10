import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ role: '', status: '' });

  // Redirect non-admin users
  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('q', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await api.get(`/users?${params}`);
      const data = Array.isArray(res) ? res : [];
      setUsers(data);
      setResultCount(data.length);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      role: u.role || 'viewer',
      status: u.status || 'active',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) {
      setFormError('Role is required');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await api.put(`/users/${editing.id}`, form);
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return <div className="empty-state">Access denied. Admin privileges required.</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>User Management</h2>
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>

      {error && <div className="empty-state">{error}</div>}

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '--'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge--${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge--${u.status || 'active'}`}>
                        {(u.status || 'active').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '--'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    </td>
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

      {showModal && editing && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit User</h3>
            <div style={{ marginBottom: '16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {editing.name || editing.email}
            </div>
            <form onSubmit={handleSubmit}>
              {formError && <div className="login-error" style={{ marginBottom: '16px' }}>{formError}</div>}
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={handleChange('role')}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={handleChange('status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
