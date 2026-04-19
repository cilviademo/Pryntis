import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PresencePill from '../components/PresencePill';
import MediaUploader from '../components/MediaUploader';
import MediaVersionHistory from '../components/MediaVersionHistory';
import AudioPlayer from '../components/AudioPlayer';
import { maskEmail, maskPhone } from '../utils/pii';

export default function ArtistDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const [artist, setArtist] = useState(null);
  const [projects, setProjects] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [a, p] = await Promise.all([
          api.get(`/artists/${id}`),
          api.get(`/projects?artist_id=${id}`),
        ]);
        setArtist(a);
        setProjects(Array.isArray(p) ? p : []);

        // These may 404 or not exist yet -- load separately so they don't block
        try {
          const subs = await api.get(`/pass/subscriptions?artist_id=${id}`);
          const subData = Array.isArray(subs) ? subs[0] || null : subs;
          setSubscription(subData);
        } catch { /* no subscription data */ }

        try {
          const kpiData = await api.get(`/kpi/artist/${id}`);
          setKpi(kpiData);
        } catch { /* no KPI data */ }

        try {
          const t = await api.get(`/tasks?artist_id=${id}`);
          setTasks(Array.isArray(t) ? t : []);
        } catch { /* no tasks */ }
      } catch (err) {
        console.error('Failed to load artist:', err);
        setError('Failed to load artist details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="loading">Loading artist...</div>;
  if (error && !artist) return <div className="empty-state">{error}</div>;
  if (!artist) return <div className="empty-state">Artist not found</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            <Link to="/artists">Artists</Link>
            <span style={{ margin: '0 6px' }}>/</span>
            <span>{artist.stage_name || artist.name}</span>
          </div>
          <h2>{artist.stage_name || artist.name}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PresencePill roomId={`artist:${id}`} />
          <span className={`badge badge--${artist.status}`}>
            {(artist.status || '').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Profile Section */}
      <div className="detail-section">
        <h3>Profile</h3>
        <div className="detail-grid">
          <div className="detail-field">
            <span className="detail-field__label">Full Name</span>
            <span className="detail-field__value">{artist.name}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Stage Name</span>
            <span className="detail-field__value">{artist.stage_name || '--'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Email</span>
            <span className="detail-field__value">{artist.email ? maskEmail(artist.email) : '--'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Phone</span>
            <span className="detail-field__value">{artist.phone ? maskPhone(artist.phone) : '--'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Genre</span>
            <span className="detail-field__value">{artist.genre || '--'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Status</span>
            <span className="detail-field__value" style={{ textTransform: 'capitalize' }}>
              {(artist.status || '').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Joined</span>
            <span className="detail-field__value">
              {artist.created_at ? new Date(artist.created_at).toLocaleDateString() : '--'}
            </span>
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

      {/* Media Section */}
      <div className="detail-section">
        <h3>Media Files</h3>
        <MediaVersionHistory ownerType="artist" ownerId={id} canManage={canEdit} />
        {canEdit && (
          <div style={{ marginTop: '12px' }}>
            <MediaUploader ownerType="artist" ownerId={id} onUploadComplete={() => window.location.reload()} />
          </div>
        )}
      </div>

      {/* KPI Section */}
      {kpi && (
        <div className="detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Key Performance Indicators</h3>
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => {
                const token = sessionStorage.getItem('pryntis_token');
                fetch(`/api/v1/pdf/royalty/statements/${id}.pdf`, { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.blob())
                  .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `royalty-statement-${(artist.stage_name || artist.name).replace(/[^a-z0-9]/gi, '-')}.pdf`;
                    a.click();
                  });
              }}>Export Royalty PDF</button>
            )}
          </div>
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card__label">Gross Revenue</div>
              <div className="summary-card__value">
                ${typeof kpi.gross_revenue === 'number' ? kpi.gross_revenue.toLocaleString() : kpi.gross_revenue || '0'}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card__label">Recoupable Balance</div>
              <div className="summary-card__value">
                ${typeof kpi.recoupable_balance === 'number' ? kpi.recoupable_balance.toLocaleString() : kpi.recoupable_balance || '0'}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card__label">Pipeline Value</div>
              <div className="summary-card__value">
                ${typeof kpi.pipeline_value === 'number' ? kpi.pipeline_value.toLocaleString() : kpi.pipeline_value || '0'}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card__label">Payable</div>
              <div className="summary-card__value">
                ${typeof kpi.payable === 'number' ? kpi.payable.toLocaleString() : kpi.payable || '0'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Section */}
      <div className="detail-section">
        <h3>Subscription</h3>
        {subscription ? (
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-field__label">Tier</span>
              <span className="detail-field__value">{subscription.tier_name || subscription.tier || '--'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Status</span>
              <span className="detail-field__value">
                <span className={`badge badge--${subscription.status || 'inactive'}`}>
                  {(subscription.status || 'inactive').replace(/_/g, ' ')}
                </span>
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">Start Date</span>
              <span className="detail-field__value">
                {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString() : '--'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field__label">End Date</span>
              <span className="detail-field__value">
                {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : '--'}
              </span>
            </div>
          </div>
        ) : (
          <div className="empty-state">No active subscription</div>
        )}
      </div>

      {/* Projects Section */}
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
                      <span className={`badge badge--${project.status}`}>
                        {(project.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '--'}</td>
                    <td>{project.target_completion_date ? new Date(project.target_completion_date).toLocaleDateString() : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tasks Section */}
      <div className="detail-section">
        <h3>Tasks ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <div className="empty-state">No tasks for this artist</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>
                      <span className={`badge badge--${task.priority || 'medium'}`}>
                        {task.priority || 'medium'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge--${task.status}`}>
                        {(task.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '--'}</td>
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
