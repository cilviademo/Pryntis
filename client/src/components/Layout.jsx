import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-brand">Pryntis</h1>
          <span className="sidebar-subtitle">Panel</span>
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

          {/* OPS */}
          <div className="nav-section-label">Ops</div>
          <NavLink to="/tasks" className="nav-link">
            Tasks
          </NavLink>
          <NavLink to="/analytics" className="nav-link">
            Analytics
          </NavLink>

          {/* ADMIN */}
          {isAdmin && (
            <>
              <div className="nav-section-label">Admin</div>
              <NavLink to="/users" className="nav-link">
                Users
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="user-role-badge">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
