import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * Parse JWT payload without verification (client-side only).
 */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/**
 * Role hierarchy for RBAC — higher index = more access.
 * Used to determine which nav sections / pages are visible.
 */
const ROLE_ACCESS = {
  viewer:         ['dashboard'],
  contributor:    ['dashboard', 'assets', 'projects', 'tasks'],
  audio_engineer: ['dashboard', 'assets', 'projects', 'templates', 'tasks'],
  manager:        ['dashboard', 'artists', 'projects', 'subscriptions', 'assets', 'placements', 'contacts', 'templates', 'tasks', 'analytics', 'business-ops', 'calendar', 'settings'],
  admin:          ['*'],
  owner:          ['*'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(!!api.getToken());

  // Impersonation state — derived from JWT claims
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatorInfo, setImpersonatorInfo] = useState(null);

  /**
   * Detect impersonation from the current token.
   */
  const detectImpersonation = useCallback((tok) => {
    if (!tok) {
      setIsImpersonating(false);
      setImpersonatorInfo(null);
      return;
    }
    const payload = parseJwt(tok);
    if (payload?.is_impersonation && payload?.impersonator_id) {
      setIsImpersonating(true);
      setImpersonatorInfo({ id: payload.impersonator_id });
    } else {
      setIsImpersonating(false);
      setImpersonatorInfo(null);
    }
  }, []);

  // Rehydrate user from stored token on mount
  useEffect(() => {
    const stored = api.getToken();
    if (!stored) return;

    detectImpersonation(stored);

    api.request('GET', '/auth/me')
      .then((data) => {
        setUser(data);
        setToken(stored);
      })
      .catch(() => {
        api.setToken(null);
        setToken(null);
        setUser(null);
        setIsImpersonating(false);
        setImpersonatorInfo(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.token);
      setToken(data.token);
      setUser(data.user);
      detectImpersonation(data.token);
      return data;
    } finally {
      setLoading(false);
    }
  }, [detectImpersonation]);

  const logout = useCallback(() => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
    setImpersonatorInfo(null);
  }, []);

  /**
   * Start impersonating a target user.
   * Called from UsersPage — stores the new token and reloads user state.
   */
  const startImpersonation = useCallback(async (targetUserId) => {
    const data = await api.post(`/admin/impersonate/${targetUserId}`);
    const newToken = data.token;
    if (newToken) {
      api.setToken(newToken);
      setToken(newToken);
      setUser(data.user);
      detectImpersonation(newToken);
    }
    return data;
  }, [detectImpersonation]);

  /**
   * Exit impersonation — restore original admin session.
   */
  const exitImpersonation = useCallback(async () => {
    const data = await api.post('/admin/exit-impersonation');
    const newToken = data.token;
    if (newToken) {
      api.setToken(newToken);
      setToken(newToken);
      setUser(data.user);
      detectImpersonation(newToken);
    }
    return data;
  }, [detectImpersonation]);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      if (Array.isArray(role)) return role.includes(user.role);
      return user.role === role;
    },
    [user]
  );

  /**
   * The effective role for UI gating.
   * When impersonating, this is the impersonated user's role.
   * When not impersonating, this is the logged-in user's role.
   */
  const effectiveRole = user?.role || null;

  const canEdit = useMemo(
    () => ['owner', 'admin', 'manager'].includes(effectiveRole),
    [effectiveRole]
  );

  const isAdmin = useMemo(
    () => effectiveRole === 'admin' || effectiveRole === 'owner',
    [effectiveRole]
  );

  const isEngineer = useMemo(() => effectiveRole === 'audio_engineer', [effectiveRole]);

  /**
   * Check if a given page/section key is accessible for the current effective role.
   * Admin/owner always have access to everything.
   */
  const canAccessPage = useCallback((pageKey) => {
    if (!effectiveRole) return false;
    const allowed = ROLE_ACCESS[effectiveRole] || [];
    if (allowed.includes('*')) return true;
    return allowed.includes(pageKey);
  }, [effectiveRole]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      hasRole,
      canEdit,
      isAdmin,
      isEngineer,
      isAuthenticated: !!token,
      // Impersonation
      isImpersonating,
      impersonatorInfo,
      startImpersonation,
      exitImpersonation,
      canAccessPage,
      effectiveRole,
    }),
    [user, token, loading, login, logout, hasRole, canEdit, isAdmin, isEngineer,
     isImpersonating, impersonatorInfo, startImpersonation, exitImpersonation,
     canAccessPage, effectiveRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
