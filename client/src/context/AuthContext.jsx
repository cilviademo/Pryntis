import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(!!api.getToken()); // true while rehydrating

  // Rehydrate user from stored token on mount
  useEffect(() => {
    const stored = api.getToken();
    if (!stored) return;

    api.request('GET', '/auth/me')
      .then((data) => {
        setUser(data);
        setToken(stored);
      })
      .catch(() => {
        // Token expired or invalid — clear it silently
        api.setToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      if (Array.isArray(role)) return role.includes(user.role);
      return user.role === role;
    },
    [user]
  );

  const canEdit = useMemo(
    () => user?.role === 'admin' || user?.role === 'manager',
    [user]
  );

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

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
      isAuthenticated: !!token,
    }),
    [user, token, loading, login, logout, hasRole, canEdit, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
