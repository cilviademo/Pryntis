import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Persistent banner shown when an admin is impersonating another user.
 * Provides one-click exit back to original admin session.
 * Uses AuthContext for all state — no direct token reads.
 */
export default function ImpersonationBanner() {
  const { user, isImpersonating, exitImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = async () => {
    try {
      await exitImpersonation();
      navigate('/admin/users');
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
    }
  };

  return (
    <div className="impersonation-banner">
      <div className="impersonation-banner-content">
        <span className="impersonation-indicator" />
        <span>
          Viewing as <strong>{user?.first_name} {user?.last_name}</strong>
          <span className="impersonation-role">{user?.role}</span>
        </span>
      </div>
      <button className="btn btn-sm impersonation-exit-btn" onClick={handleExit}>
        Return to Admin
      </button>
    </div>
  );
}
