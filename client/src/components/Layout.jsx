import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import ImpersonationBanner from './ImpersonationBanner';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
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

      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
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
          {/* CORE */}
          <div className="nav-section-label">Core</div>
          <NavLink to="/" end className="nav-link">
            Dashboard
          </NavLink>
          <NavLink to="/artists" className="nav-link">
            Artists
          </NavLink>
          <NavLink to="/projects" className="nav-link">
            Projects
          </NavLink>

          {/* PASS */}
          <div className="nav-section-label">Pass</div>
          <NavLink to="/pass" className="nav-link">
            Subscriptions
          </NavLink>

          {/* PORT */}
          <div className="nav-section-label">Port</div>
          <NavLink to="/port/assets" className="nav-link">
            Assets
          </NavLink>
          <NavLink to="/port/placements" className="nav-link">
            Placements
          </NavLink>
          <NavLink to="/port/contacts" className="nav-link">
            Contacts
          </NavLink>
          <NavLink to="/port/templates" className="nav-link">
            Templates
          </NavLink>

          {/* OPS */}
          <div className="nav-section-label">Ops</div>
          <NavLink to="/tasks" className="nav-link">
            Tasks
          </NavLink>
          <NavLink to="/analytics" className="nav-link">
            Analytics
          </NavLink>
          <NavLink to="/business" className="nav-link">
            Business Ops
          </NavLink>
          <NavLink to="/calendar" className="nav-link">
            Calendar
          </NavLink>
          <NavLink to="/settings" className="nav-link">
            Settings
          </NavLink>

          {/* ADMIN */}
          {isAdmin && (
            <>
              <div className="nav-section-label">Admin</div>
              <NavLink to="/users" className="nav-link">
                Users
              </NavLink>
              <NavLink to="/admin/analytics" className="nav-link">
                Deep Analytics
              </NavLink>
            </>
          )}
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
        <Outlet />
      </main>
    </div>
  );
}
