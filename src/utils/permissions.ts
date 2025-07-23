import { User, Permission } from '../types';

// Type for permission name
export type PermissionName = string;

/**
 * Check if a user has a specific permission
 * @param user The user to check
 * @param permissionName The name of the permission to check for
 * @returns True if the user has the permission, false otherwise
 */
export const hasPermission = (user: User | null, permissionName: PermissionName): boolean => {
  if (!user || !user.role || !Array.isArray(user.role.permissions)) {
    return false;
  }

  return user.role.permissions.some(permission => 
    permission && typeof permission === 'object' && permission.name === permissionName
  );
};

/**
 * Check if a user has any of the specified permissions
 * @param user The user to check
 * @param permissionNames Array of permission names to check for
 * @returns True if the user has any of the permissions, false otherwise
 */
export const hasAnyPermission = (user: User | null, permissionNames: PermissionName[]): boolean => {
  if (!user || !user.role || !Array.isArray(user.role.permissions) || !Array.isArray(permissionNames)) {
    return false;
  }

  return user.role.permissions.some(permission => 
    permission && typeof permission === 'object' && permission.name && 
    permissionNames.includes(permission.name)
  );
};

/**
 * Check if a user has all of the specified permissions
 * @param user The user to check
 * @param permissionNames Array of permission names to check for
 * @returns True if the user has all of the permissions, false otherwise
 */
export const hasAllPermissions = (user: User | null, permissionNames: PermissionName[]): boolean => {
  if (!user || !user.role || !Array.isArray(user.role.permissions) || !Array.isArray(permissionNames)) {
    return false;
  }

  // If checking for no permissions, return true
  if (permissionNames.length === 0) {
    return true;
  }

  const userPermissionNames = user.role.permissions
    .filter(p => p && typeof p === 'object' && p.name)
    .map(p => p.name);

  return permissionNames.every(permName => userPermissionNames.includes(permName));
};

/**
 * Get all permissions of a user
 * @param user The user to get permissions for
 * @returns Array of permission names
 */
export const getUserPermissions = (user: User | null): PermissionName[] => {
  if (!user || !user.role || !Array.isArray(user.role.permissions)) {
    return [];
  }

  return user.role.permissions
    .filter(p => p && typeof p === 'object' && p.name)
    .map(p => p.name);
};

/**
 * Permission constants
 * These constants represent all available permissions in the system
 * Use these constants instead of string literals to avoid typos
 * @example
 * hasPermission(user, PERMISSIONS.USER_READ)
 */
export const PERMISSIONS: Record<string, PermissionName> = {
  USER_READ: 'USER_READ',
  USER_WRITE: 'USER_WRITE',
  USER_DELETE: 'USER_DELETE',
  KPI_READ: 'KPI_READ',
  KPI_WRITE: 'KPI_WRITE',
  KPI_DELETE: 'KPI_DELETE',
  EVALUATION_READ: 'EVALUATION_READ',
  EVALUATION_WRITE: 'EVALUATION_WRITE',
  EVALUATION_APPROVE: 'EVALUATION_APPROVE',
  EVALUATION_VIEW_INCREMENT: 'EVALUATION_VIEW_INCREMENT',
  EVALUATION_VIEW_ADMIN_COMMENTS: 'EVALUATION_VIEW_ADMIN_COMMENTS',
};

/**
 * Navigation permission constants
 * These constants represent permissions for navigation access
 * @example
 * hasPermission(user, NAVIGATION_PERMISSIONS.DASHBOARD_VIEW)
 */
export const NAVIGATION_PERMISSIONS: Record<string, PermissionName> = {
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  EVALUATION_VIEW: 'EVALUATION_VIEW',
  KPI_VIEW: 'KPI_VIEW',
  USERS_VIEW: 'USERS_VIEW',
  ROLE_MANAGEMENT_VIEW: 'ROLE_MANAGEMENT_VIEW',
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  ACCESS_CONTROL_VIEW: 'ACCESS_CONTROL_VIEW', // Super admin only
};

/**
 * Check if a user is the super admin
 * @param user The user to check
 * @returns True if the user is the super admin
 */
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.email === 'sgul@trafix.com';
};

/**
 * Enhanced permission checker that handles both role-based and super admin access
 * @param user The user to check
 * @param permissionName The name of the permission to check for
 * @returns True if the user has the permission or is super admin for special permissions
 */
export const hasPermissionEnhanced = (user: User | null, permissionName: PermissionName): boolean => {
  // Special case for access control - only super admin
  if (permissionName === 'ACCESS_CONTROL_VIEW') {
    return isSuperAdmin(user);
  }
  
  // For all other permissions, use the standard role-based check
  return hasPermission(user, permissionName);
};

/**
 * Check if a user has a specific granular permission
 * @param user The user to check
 * @param moduleName The module name (e.g., 'kpis', 'users')
 * @param actionName The action name (e.g., 'header_navigation', 'read')
 * @returns Promise<boolean> True if the user has the granular permission
 */
export const hasGranularPermission = async (user: User | null, moduleName: string, actionName: string): Promise<boolean> => {
  if (!user || !user.id) {
    return false;
  }

  try {
    // Use the same API base URL configuration as the rest of the app
    const API_BASE_URL = process.env.NODE_ENV === 'production' || window.location.hostname === 'localhost' && window.location.port === '80' 
      ? '/api' 
      : 'http://localhost:8000';
    
    const response = await fetch(`${API_BASE_URL}/access-control/users/${user.id}/check-permission/${moduleName}/${actionName}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.has_permission === true;
    }
  } catch (error) {
    console.error('Error checking granular permission:', error);
  }

  return false;
};

/**
 * Check if a user has either role-based permission OR granular permission
 * @param user The user to check
 * @param rolePermissionName The role-based permission name
 * @param moduleName The module name for granular permission check
 * @param actionName The action name for granular permission check
 * @returns Promise<boolean> True if the user has either permission
 */
export const hasEitherPermission = async (
  user: User | null, 
  rolePermissionName: PermissionName, 
  moduleName: string, 
  actionName: string
): Promise<boolean> => {
  // First check role-based permission
  if (hasPermission(user, rolePermissionName)) {
    return true;
  }

  // Then check granular permission
  return await hasGranularPermission(user, moduleName, actionName);
};

/**
 * GRANULAR PERMISSION CONSTANTS
 * These constants represent module.action permissions for the granular access control system
 */
export const GRANULAR_PERMISSIONS = {
  KPI_HEADER_NAVIGATION: { module: 'kpis', action: 'header_navigation' },
  KPI_READ: { module: 'kpis', action: 'read' },
  KPI_WRITE: { module: 'kpis', action: 'write' },
  KPI_DELETE: { module: 'kpis', action: 'delete' },
  USERS_READ: { module: 'users', action: 'read' },
  USERS_WRITE: { module: 'users', action: 'write' },
  EVALUATIONS_APPROVE: { module: 'evaluations', action: 'approve' },
} as const;
