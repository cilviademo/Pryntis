import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import '../components/shared.css';

export default function ArtistDetailPage() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [a, p] = await Promise.all([
          api.get(`/artists/${id}`),
          api.get(`/projects?artist_id=${id}`),
        ]);
        setArtist(a);
        setProjects(p);
      } catch (err) {
        console.error('Failed to load artist:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="loading">Loading artist...</div>;
  if (!artist) return <div className="empty-state">Artist not found</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/artists" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Artists</Link>
          <h2 style={{ marginTop: '4px' }}>{artist.stage_name || artist.name}</h2>
        </div>
        <span className={`status-badge status-badge--${artist.status}`}>{artist.status}</span>
      </div>

      <div className="detail-section">
        <h3>Profile</h3>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-field__label">Full Name</span>
            <span className="detail-field__value">{artist.name}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Stage Name</span>
            <span className="detail-field__value">{artist.stage_name || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Email</span>
            <span className="detail-field__value">{artist.email || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Phone</span>
            <span className="detail-field__value">{artist.phone || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Genre</span>
            <span className="detail-field__value">{artist.genre || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Joined</span>
            <span className="detail-field__value">{new Date(artist.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        {artist.bio && (
          <div style={{ marginTop: '16px' }}>
            <span className="detail-field__label">Bio</span>
            <p className="detail-field__value" style={{ marginTop: '4px' }}>{artist.bio}</p>
          </div>
        )}
        {artist.notes && (
          <div style={{ marginTop: '12px' }}>
            <span className="detail-field__label">Notes</span>
            <p className="detail-field__value" style={{ marginTop: '4px' }}>{artist.notes}</p>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Projects ({projects.length})</h3>
        {projects.length === 0 ? (
          <div className="empty-state">No projects associated with this artist</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Target Completion</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><Link to={`/projects/${project.id}`}>{project.title}</Link></td>
                    <td>
                      <span className={`status-badge status-badge--${project.status}`}>
                        {project.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}</td>
                    <td>{project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : '—'}</td>
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
