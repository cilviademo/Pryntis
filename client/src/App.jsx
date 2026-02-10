import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artists/:id" element={<ArtistDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route path="pass" element={<PassPage />} />
        <Route path="port/assets" element={<AssetsPage />} />
        <Route path="port/assets/:id" element={<AssetDetailPage />} />
        <Route path="port/placements" element={<PlacementsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
