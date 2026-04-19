import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ArtistsPage from './pages/ArtistsPage';
import ArtistDetailPage from './pages/ArtistDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import UsersPage from './pages/UsersPage';
import PassPage from './pages/PassPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import PlacementsPage from './pages/PlacementsPage';
import TasksPage from './pages/TasksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ContactsPage from './pages/ContactsPage';
import TemplatesPage from './pages/TemplatesPage';
import BusinessOpsPage from './pages/BusinessOpsPage';
import CalendarPage from './pages/CalendarPage';
import DeepAnalyticsPage from './pages/DeepAnalyticsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

/**
 * Role-gated route — redirects to dashboard if the current effective role
 * does not have access to the given page key.
 */
function RoleRoute({ pageKey, children }) {
  const { canAccessPage } = useAuth();
  if (!canAccessPage(pageKey)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="loading">Loading...</div> : isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard — always accessible */}
        <Route index element={<DashboardPage />} />

        {/* CORE */}
        <Route path="artists" element={<RoleRoute pageKey="artists"><ArtistsPage /></RoleRoute>} />
        <Route path="artists/:id" element={<RoleRoute pageKey="artists"><ArtistDetailPage /></RoleRoute>} />
        <Route path="projects" element={<RoleRoute pageKey="projects"><ProjectsPage /></RoleRoute>} />
        <Route path="projects/:id" element={<RoleRoute pageKey="projects"><ProjectDetailPage /></RoleRoute>} />

        {/* PASS */}
        <Route path="pass" element={<RoleRoute pageKey="subscriptions"><PassPage /></RoleRoute>} />
        <Route path="pass/*" element={<RoleRoute pageKey="subscriptions"><PassPage /></RoleRoute>} />

        {/* PORT */}
        <Route path="port/assets" element={<RoleRoute pageKey="assets"><AssetsPage /></RoleRoute>} />
        <Route path="port/assets/:id" element={<RoleRoute pageKey="assets"><AssetDetailPage /></RoleRoute>} />
        <Route path="port/placements" element={<RoleRoute pageKey="placements"><PlacementsPage /></RoleRoute>} />
        <Route path="port/contacts" element={<RoleRoute pageKey="contacts"><ContactsPage /></RoleRoute>} />
        <Route path="port/templates" element={<RoleRoute pageKey="templates"><TemplatesPage /></RoleRoute>} />

        {/* OPS */}
        <Route path="tasks" element={<RoleRoute pageKey="tasks"><TasksPage /></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute pageKey="analytics"><AnalyticsPage /></RoleRoute>} />
        <Route path="business" element={<RoleRoute pageKey="business-ops"><BusinessOpsPage /></RoleRoute>} />
        <Route path="calendar" element={<RoleRoute pageKey="calendar"><CalendarPage /></RoleRoute>} />
        <Route path="settings" element={<RoleRoute pageKey="settings"><SettingsPage /></RoleRoute>} />

        {/* ADMIN */}
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <AdminRoute>
              <DeepAnalyticsPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
