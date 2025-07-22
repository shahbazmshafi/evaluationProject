import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, NAVIGATION_PERMISSIONS } from '../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
  redirectPath?: string;
}

/**
 * A component that protects routes based on user permissions
 * @param children The component to render if the user has the required permission
 * @param requiredPermission The permission required to access the route
 * @param redirectPath The path to redirect to if the user doesn't have the required permission
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  redirectPath = '/'
}) => {
  const { user } = useAuth();

  // Special case for Dashboard and Settings which are always allowed
  if (requiredPermission === NAVIGATION_PERMISSIONS.DASHBOARD_VIEW || 
      requiredPermission === NAVIGATION_PERMISSIONS.SETTINGS_VIEW) {
    return <>{children}</>;
  }

  // Check if the user has the required permission
  if (!hasPermission(user, requiredPermission)) {
    console.warn(`Access denied: User lacks permission ${requiredPermission}`);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
