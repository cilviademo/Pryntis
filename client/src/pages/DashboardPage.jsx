import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import '../components/shared.css';

const COLORS = ['#6c63ff', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sum, act] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/recent-activity'),
        ]);
        setSummary(sum);
        setActivity(act);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!summary) return <div className="empty-state">Failed to load dashboard data</div>;

  const artistStatusData = summary.artists.byStatus.map((s) => ({
    name: s.status,
    count: parseInt(s.count, 10),
  }));

  const projectStatusData = summary.projects.byStatus.map((s) => ({
    name: s.status.replace('_', ' '),
    count: parseInt(s.count, 10),
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card__label">Total Artists</div>
          <div className="summary-card__value">{summary.artists.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Total Projects</div>
          <div className="summary-card__value">{summary.projects.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">Active Artists</div>
          <div className="summary-card__value">
            {summary.artists.byStatus.find((s) => s.status === 'active')?.count || 0}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card__label">In-Progress Projects</div>
          <div className="summary-card__value">
            {summary.projects.byStatus.find((s) => s.status === 'in_progress')?.count || 0}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="detail-section">
          <h3>Projects by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3143" />
              <XAxis dataKey="name" tick={{ fill: '#9197b3', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9197b3', fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2d3143', borderRadius: '8px' }}
                labelStyle={{ color: '#e4e6ef' }}
              />
              <Bar dataKey="count" fill="#6c63ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="detail-section">
          <h3>Artists by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={artistStatusData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="count"
                label={({ name, count }) => `${name} (${count})`}
              >
                {artistStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2d3143', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="detail-section">
        <h3>Recent Activity</h3>
        {activity.length === 0 ? (
          <div className="empty-state">No recent activity</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td>
                      <span className={`status-badge status-badge--${item.type === 'artist' ? 'active' : 'in_progress'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td>
                      <Link to={`/${item.type}s/${item.id}`}>{item.title}</Link>
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${item.status}`}>
                        {item.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(item.updated_at).toLocaleDateString()}</td>
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
