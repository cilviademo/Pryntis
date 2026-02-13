import React, { useState } from 'react';

/**
 * Superset Integration Page - Embedded deep analytics.
 * When SUPERSET_URL is configured, embeds Superset dashboards via iframe.
 * Otherwise shows setup instructions and integration placeholder.
 */
export default function DeepAnalyticsPage() {
  const [supersetUrl] = useState(() => {
    // In production, this would come from an API config endpoint
    return null; // Superset not configured by default
  });

  return (
    <div>
      <div className="page-header">
        <h2>Deep Analytics</h2>
        <span className="badge badge--active">Superset Integration</span>
      </div>

      {supersetUrl ? (
        <div className="detail-section">
          <iframe
            src={supersetUrl}
            title="Superset Analytics Dashboard"
            style={{
              width: '100%',
              height: 'calc(100vh - 160px)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              background: 'var(--color-surface)',
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      ) : (
        <div className="detail-section">
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              <path d="M9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2" />
            </svg>
            <h3 style={{ marginBottom: '12px' }}>Apache Superset Not Configured</h3>
            <p className="text-secondary" style={{ maxWidth: '500px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              Pryntis supports embedded Apache Superset dashboards for advanced analytics,
              custom SQL exploration, and deep data visualization beyond the built-in Panel KPIs.
            </p>

            <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', background: 'var(--color-surface-2)', padding: '20px', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginBottom: '12px' }}>Setup Instructions</h4>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '13px' }}>
                <li>Add Superset to your Docker Compose stack (see <code>docs/superset.md</code>)</li>
                <li>Connect Superset to the Pryntis PostgreSQL database</li>
                <li>Import the default Pryntis dashboard JSON from <code>docs/superset-dashboard.json</code></li>
                <li>Set <code>SUPERSET_URL</code> in your <code>.env</code> file</li>
                <li>Set <code>SUPERSET_GUEST_TOKEN_SECRET</code> for secure embedding</li>
                <li>Restart the Pryntis server</li>
              </ol>

              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'monospace' }}>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}># .env configuration</div>
                <div>SUPERSET_URL=http://localhost:8088</div>
                <div>SUPERSET_GUEST_TOKEN_SECRET=your-secret-here</div>
                <div>SUPERSET_DASHBOARD_ID=1</div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '8px' }}>What You Get</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
                {[
                  { title: 'Custom SQL Queries', desc: 'Write and save SQL against your live database' },
                  { title: 'Advanced Charts', desc: 'Heatmaps, pivot tables, scatter plots, and more' },
                  { title: 'Scheduled Reports', desc: 'Email periodic reports to stakeholders' },
                  { title: 'Dashboard Sharing', desc: 'Share interactive dashboards with team members' },
                ].map((f, i) => (
                  <div key={i} style={{ padding: '12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="font-semibold text-sm" style={{ marginBottom: '4px' }}>{f.title}</div>
                    <div className="text-xs text-muted">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="detail-section" style={{ marginTop: '16px' }}>
        <h3>Built-in Analytics Summary</h3>
        <p className="text-sm text-secondary" style={{ lineHeight: '1.6', marginBottom: '12px' }}>
          Pryntis Panel already provides comprehensive KPI dashboards, health scores, pipeline analytics,
          and financial reporting. The Superset integration is for power users who need custom queries and
          advanced visualization beyond what the Panel provides out of the box.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a href="/analytics" className="btn btn-secondary btn-sm">View Analytics</a>
          <a href="/business" className="btn btn-secondary btn-sm">View Business Ops</a>
          <a href="/" className="btn btn-secondary btn-sm">View Dashboard</a>
        </div>
      </div>
    </div>
  );
}
