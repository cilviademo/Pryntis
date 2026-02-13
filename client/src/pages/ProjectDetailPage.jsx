import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/projects/${id}`);
        setProject(data);

        try {
          const a = await api.get(`/assets?project_id=${id}`);
          setAssets(Array.isArray(a) ? a : []);
        } catch { /* no assets */ }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="loading">Loading project...</div>;
  if (error && !project) return <div className="empty-state">{error}</div>;
  if (!project) return <div className="empty-state">Project not found</div>;

  const collaborators = project.collaborators || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            <Link to="/projects">Projects</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <span>{project.title}</span>
          </div>
          <h2>{project.title}</h2>
        </div>
        <span className={`badge badge--${project.status}`}>
          {(project.status || '').replace(/_/g, ' ')}
        </span>
      </div>

      {/* Details Section */}
      <div className="detail-section">
        <h3>Details</h3>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-field__label">Primary Artist</span>
            <span className="detail-field__value">
              {project.artist_id ? (
                <Link to={`/artists/${project.artist_id}`}>
                  {project.artist_stage_name || project.artist_name || 'View Artist'}
                </Link>
              ) : '--'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Status</span>
            <span className="detail-field__value" style={{ textTransform: 'capitalize' }}>
              {(project.status || '').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Start Date</span>
            <span className="detail-field__value">
              {project.start_date ? new Date(project.start_date).toLocaleDateString() : '--'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Target Completion</span>
            <span className="detail-field__value">
              {project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : '--'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Created</span>
            <span className="detail-field__value">
              {project.created_at ? new Date(project.created_at).toLocaleDateString() : '--'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Last Updated</span>
            <span className="detail-field__value">
              {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '--'}
            </span>
          </div>
        </div>
        {project.description && (
          <div style={{ marginTop: '16px' }}>
            <span className="detail-field__label">Description</span>
            <p className="detail-field__value" style={{ marginTop: '4px' }}>{project.description}</p>
          </div>
        )}
      </div>

      {/* Collaborators Section */}
      <div className="detail-section">
        <h3>Collaborators ({collaborators.length})</h3>
        {collaborators.length === 0 ? (
          <div className="empty-state">No collaborators on this project</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Role</th>
                  <th>Split %</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((collab) => (
                  <tr key={collab.id || collab.artist_id}>
                    <td>
                      <Link to={`/artists/${collab.artist_id}`}>
                        {collab.artist_stage_name || collab.artist_name || 'Unknown'}
                      </Link>
                    </td>
                    <td>{collab.role_description || '--'}</td>
                    <td>{collab.split_percentage != null ? `${collab.split_percentage}%` : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Linked Assets Section */}
      <div className="detail-section">
        <h3>Linked Assets ({assets.length})</h3>
        {assets.length === 0 ? (
          <div className="empty-state">No assets linked to this project</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Genre</th>
                  <th>BPM</th>
                  <th>Key</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td><Link to={`/port/assets/${asset.id}`}>{asset.title}</Link></td>
                    <td>
                      <span className={`badge badge--${asset.file_type || 'unknown'}`}>
                        {asset.file_type || '--'}
                      </span>
                    </td>
                    <td>{asset.genre || '--'}</td>
                    <td>{asset.bpm || '--'}</td>
                    <td>{asset.key_signature || '--'}</td>
                    <td>{asset.duration ? `${Math.floor(asset.duration / 60)}:${String(asset.duration % 60).padStart(2, '0')}` : '--'}</td>
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
