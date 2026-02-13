import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      {/* Appearance */}
      <div className="detail-section">
        <h3>Appearance</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div>
            <div className="font-semibold">Theme</div>
            <div className="text-sm text-secondary">Choose between light and dark mode</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={toggleTheme}>
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="detail-section">
        <h3>Security</h3>

        <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="font-semibold">Two-Factor Authentication (2FA)</span>
            <span className="badge">Coming Soon</span>
          </div>
          <p className="text-sm text-secondary" style={{ lineHeight: '1.6', marginBottom: '8px' }}>
            Pryntis will support TOTP-based two-factor authentication (Google Authenticator, Authy)
            and WebAuthn hardware key support (YubiKey, Touch ID). This adds an additional layer of
            security beyond password authentication.
          </p>
          <div className="text-xs text-muted">
            Planned implementation: TOTP secret generation, QR code enrollment, backup codes,
            WebAuthn credential registration. See <code>docs/roadmap.md</code> for details.
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="font-semibold">Session Management</span>
          </div>
          <p className="text-sm text-secondary" style={{ lineHeight: '1.6' }}>
            Your current session is secured with JWT token versioning. Token version:
            <code style={{ marginLeft: '4px' }}>{user?.token_version ?? 'N/A'}</code>.
            If you suspect unauthorized access, contact your administrator to revoke all sessions.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <div className="detail-section">
        <h3>Notifications</h3>

        <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="font-semibold">In-App Notifications</span>
            <span className="badge badge--success">Active</span>
          </div>
          <p className="text-sm text-secondary" style={{ lineHeight: '1.6' }}>
            You receive in-app notifications for calendar events, placement updates, and system alerts.
            Access notifications via the bell icon in the sidebar.
          </p>
        </div>

        <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="font-semibold">Email Notifications</span>
            <span className="badge">Coming Soon</span>
          </div>
          <p className="text-sm text-secondary" style={{ lineHeight: '1.6', marginBottom: '8px' }}>
            Email notification support via SMTP or SendGrid integration is planned. This will allow
            delivery of critical alerts, royalty statements, and task reminders directly to your inbox.
          </p>
          <div className="text-xs text-muted">
            Planned: SMTP/SendGrid provider, email templates, digest preferences (instant, daily, weekly).
            See <code>docs/roadmap.md</code> for details.
          </div>
        </div>
      </div>

      {/* Integrations (admin only) */}
      {isAdmin && (
        <div className="detail-section">
          <h3>Integrations</h3>

          <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="font-semibold">Apache Superset</span>
              <span className="badge">Not Configured</span>
            </div>
            <p className="text-sm text-secondary" style={{ lineHeight: '1.6' }}>
              Connect Apache Superset for advanced SQL analytics and custom dashboards.
              Navigate to <a href="/admin/analytics">Deep Analytics</a> for setup instructions.
            </p>
          </div>

          <div style={{ padding: '16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="font-semibold">Cloud Storage (S3)</span>
              <span className="badge">Local Storage Active</span>
            </div>
            <p className="text-sm text-secondary" style={{ lineHeight: '1.6' }}>
              File uploads are stored locally by default. Set <code>STORAGE_PROVIDER=s3</code> and
              configure AWS credentials in your <code>.env</code> to use Amazon S3 for production
              file storage. See <code>docs/storage.md</code> for details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
