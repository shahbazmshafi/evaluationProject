import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NAVIGATION_PERMISSIONS } from './utils/permissions';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Layout from './components/Layout';
import UsersPage from './components/UsersPage';
import KPIsPage from './components/KPIsPage';
import EvaluationsPage from './components/EvaluationsPage';
import SettingsPage from './components/SettingsPage';
import RoleManagementPage from './components/RoleManagementPage';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute requiredPermission={NAVIGATION_PERMISSIONS.DASHBOARD_VIEW}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/evaluations" element={
            <ProtectedRoute requiredPermission={NAVIGATION_PERMISSIONS.EVALUATION_VIEW}>
              <EvaluationsPage />
            </ProtectedRoute>
          } />
          <Route path="/kpis" element={
            <ProtectedRoute requiredPermission={NAVIGATION_PERMISSIONS.KPI_VIEW}>
              <KPIsPage />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute requiredPermission={NAVIGATION_PERMISSIONS.USERS_VIEW}>
              <UsersPage />
            </ProtectedRoute>
          } />
          <Route path="/roles" element={
            <ProtectedRoute requiredPermission={NAVIGATION_PERMISSIONS.ROLE_MANAGEMENT_VIEW}>
              <RoleManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requiredPermission={NAVIGATION_PERMISSIONS.SETTINGS_VIEW}>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
