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
};
