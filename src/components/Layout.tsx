import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, BarChart3, Users, Target, Shield } from 'lucide-react';
import { hasPermission, PERMISSIONS, NAVIGATION_PERMISSIONS } from '../utils/permissions';
import Header from './organisms/Header';
import Navigation from './molecules/Navigation';
import { NavigationItem } from './molecules/Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = React.memo(({ children }) => {
  const { user, logout } = useAuth();

  // Add this useEffect hook right after getting user from useAuth
  useEffect(() => {
    console.log('Current User:', user);
    console.log('User Permissions:', user?.role?.permissions);
  }, [user]);

  const navigationItems: NavigationItem[] = [
    { name: 'Dashboard', icon: BarChart3, path: '/', permission: NAVIGATION_PERMISSIONS.DASHBOARD_VIEW },
    { name: 'Evaluations', icon: Target, path: '/evaluations', permission: NAVIGATION_PERMISSIONS.EVALUATION_VIEW },
    { name: 'KPIs', icon: BarChart3, path: '/kpis', permission: NAVIGATION_PERMISSIONS.KPI_VIEW },
    { name: 'Users', icon: Users, path: '/users', permission: NAVIGATION_PERMISSIONS.USERS_VIEW },
    { name: 'Role Management', icon: Shield, path: '/roles', permission: NAVIGATION_PERMISSIONS.ROLE_MANAGEMENT_VIEW },
    // Only show Access Control to super admin
    ...(user?.email === 'sgul@trafix.com' ? [{ name: 'Access Control', icon: Shield, path: '/access-control', permission: 'ACCESS_CONTROL_VIEW' }] : []),
    { name: 'Settings', icon: Settings, path: '/settings', permission: NAVIGATION_PERMISSIONS.SETTINGS_VIEW },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        userName={user?.name || ''} 
        roleName={user?.role?.name || 'Unknown Role'} 
        onLogout={logout} 
      />

      <Navigation items={navigationItems} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
