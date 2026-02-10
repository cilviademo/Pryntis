import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import '../components/shared.css';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get(`/projects/${id}`);
        setProject(data);
      } catch (err) {
        console.error('Failed to load project:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="loading">Loading project...</div>;
  if (!project) return <div className="empty-state">Project not found</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/projects" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Projects</Link>
          <h2 style={{ marginTop: '4px' }}>{project.title}</h2>
        </div>
        <span className={`status-badge status-badge--${project.status}`}>
          {project.status?.replace('_', ' ')}
        </span>
      </div>

      <div className="detail-section">
        <h3>Details</h3>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-field__label">Primary Artist</span>
            <span className="detail-field__value">
              {project.artist_id ? (
                <Link to={`/artists/${project.artist_id}`}>
                  {project.artist_stage_name || project.artist_name}
                </Link>
              ) : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Status</span>
            <span className="detail-field__value" style={{ textTransform: 'capitalize' }}>
              {project.status?.replace('_', ' ')}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Start Date</span>
            <span className="detail-field__value">
              {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Target Completion</span>
            <span className="detail-field__value">
              {project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Created</span>
            <span className="detail-field__value">{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        {project.description && (
          <div style={{ marginTop: '16px' }}>
            <span className="detail-field__label">Description</span>
            <p className="detail-field__value" style={{ marginTop: '4px' }}>{project.description}</p>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Collaborators ({project.collaborators?.length || 0})</h3>
        {!project.collaborators || project.collaborators.length === 0 ? (
          <div className="empty-state">No collaborators on this project</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {project.collaborators.map((collab) => (
                  <tr key={collab.id}>
                    <td>
                      <Link to={`/artists/${collab.artist_id}`}>
                        {collab.artist_stage_name || collab.artist_name}
                      </Link>
                    </td>
                    <td>{collab.role_description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
