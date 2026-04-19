import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import ImpersonationBanner from './ImpersonationBanner';
import Breadcrumbs from './Breadcrumbs';

export default function Layout() {
  const { user, isAdmin, isImpersonating, canAccessPage, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /**
   * Helper: only render a nav link if the current effective role can access it.
   * Admin/owner always see everything (canAccessPage returns true for '*').
   */
  const navLink = (to, label, pageKey) => {
    if (!canAccessPage(pageKey)) return null;
    return (
      <NavLink to={to} className="nav-link">
        {label}
      </NavLink>
    );
  };

  /**
   * Helper: render a section label only if at least one child link is visible.
   */
  const navSection = (label, links) => {
    const visibleLinks = links.filter(Boolean);
    if (visibleLinks.length === 0) return null;
    return (
      <>
        <div className="nav-section-label">{label}</div>
        {visibleLinks}
      </>
    );
  };

  return (
    <div className="layout">
      {/* Mobile header */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <span className="mobile-brand">Pryntis</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NotificationBell />
        </div>
      </header>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}${isImpersonating ? ' sidebar--impersonating' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-brand">Pryntis</h1>
          <span className="sidebar-subtitle">Panel</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <GlobalSearch />
        </div>

        <nav className="sidebar-nav">
          {/* CORE — dashboard always visible, artists/projects role-gated */}
          {navSection('Core', [
            navLink('/', 'Dashboard', 'dashboard'),
            navLink('/artists', 'Artists', 'artists'),
            navLink('/projects', 'Projects', 'projects'),
          ])}

          {/* PASS */}
          {navSection('Pass', [
            navLink('/pass', 'Subscriptions', 'subscriptions'),
          ])}

          {/* PORT */}
          {navSection('Port', [
            navLink('/port/assets', 'Assets', 'assets'),
            navLink('/port/placements', 'Placements', 'placements'),
            navLink('/port/contacts', 'Contacts', 'contacts'),
            navLink('/port/templates', 'Templates', 'templates'),
          ])}

          {/* OPS */}
          {navSection('Ops', [
            navLink('/tasks', 'Tasks', 'tasks'),
            navLink('/analytics', 'Analytics', 'analytics'),
            navLink('/business', 'Business Ops', 'business-ops'),
            navLink('/calendar', 'Calendar', 'calendar'),
            navLink('/settings', 'Settings', 'settings'),
          ])}

          {/* ADMIN — only visible when effective role is admin/owner */}
          {isAdmin && navSection('Admin', [
            <NavLink key="users" to="/users" className="nav-link">Users</NavLink>,
            <NavLink key="deep" to="/admin/analytics" className="nav-link">Deep Analytics</NavLink>,
          ])}
        </nav>

        <div style={{ padding: '8px 16px 0' }}>
          <NotificationBell />
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <span className={`badge badge--${user?.role}`}>{(user?.role || '').replace(/_/g, ' ')}</span>
              {isImpersonating && (
                <span className="impersonation-tag">impersonated</span>
              )}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={toggleTheme}
            style={{ width: '100%', marginBottom: '8px', fontSize: '12px' }}
          >
            {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <ImpersonationBanner />
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
}
