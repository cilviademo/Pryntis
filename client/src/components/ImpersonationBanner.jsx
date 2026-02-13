import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Persistent banner shown when an admin is impersonating another user.
 * Provides one-click exit back to original admin session.
 */
export default function ImpersonationBanner() {
  const { user } = useAuth();

  // Check if current session is an impersonation
  const token = localStorage.getItem('pryntis_token');
  let isImpersonation = false;
  let impersonatorId = null;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isImpersonation = !!payload.is_impersonation;
      impersonatorId = payload.impersonator_id;
    } catch {
      // invalid token structure
    }
  }

  if (!isImpersonation) return null;

  const exitImpersonation = async () => {
    try {
      const res = await api.post('/admin/exit-impersonation');
      const newToken = res.data?.data?.token;
      if (newToken) {
        localStorage.setItem('pryntis_token', newToken);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
    }
  };

  return (
    <div className="impersonation-banner">
      <span>
        Viewing as <strong>{user?.first_name} {user?.last_name}</strong> ({user?.role})
      </span>
      <button className="btn btn-sm" onClick={exitImpersonation}>
        Exit Impersonation
      </button>
    </div>
  );
}
