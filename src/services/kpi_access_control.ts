// src/services/kpi_access_control.ts
import { KPI, User } from '../types';
import { apiService } from './api';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

export interface PermissionCheck {
  hasDirectReport: boolean;
  hasIndirectReport: boolean;
  isAdmin: boolean;
  hasKpiWritePermission: boolean;
}

export interface KPIAccessControl {
  canViewKPI(userId: string, kpiId: string): boolean;
  getVisibleKPIs(userId: string): Promise<KPI[]>;
  validateKPIAccess(managerId: string, targetEmployeeId?: string): Promise<boolean>;
  checkPermissions(managerId: string, targetEmployeeId?: string): Promise<PermissionCheck>;
}

export class KPIAccessControlService implements KPIAccessControl {
  private users: User[] = [];
  private kpis: KPI[] = [];
  private lastRefresh: number = 0;
  private refreshInterval: number = 60000; // 1 minute in milliseconds
  private isRefreshing: boolean = false;

  constructor() {
    // Don't refresh data immediately, wait for authentication
    // Data will be refreshed when needed and user is authenticated
  }

  async refreshData(): Promise<void> {
    // If already refreshing, wait for it to complete
    if (this.isRefreshing) {
      console.log('Already refreshing data, skipping duplicate refresh');
      return;
    }

    // Check if user is authenticated by checking for token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('User not authenticated, skipping KPI access control data refresh');
      return;
    }

    // Check if we need to refresh based on time interval
    const now = Date.now();
    if (now - this.lastRefresh < this.refreshInterval && this.users.length > 0 && this.kpis.length > 0) {
      console.log('Using cached data, last refresh was', (now - this.lastRefresh) / 1000, 'seconds ago');
      return;
    }

    try {
      this.isRefreshing = true;
      console.log('Refreshing KPI access control data...');

      // Fetch data in parallel
      const [users, kpis] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getKPIs()
      ]);

      // Log the raw users data
      console.log('Raw users data:', {
        count: users.length,
        sample: users.length > 0 ? users.slice(0, 3) : [],
        allUsers: users.map(u => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role.name,
          managerId: u.managerId ? String(u.managerId) : undefined
        }))
      });

      // Ensure all user IDs are strings and role IDs are strings
      this.users = users.map(user => {
        // Create a deep copy to avoid modifying the original object
        const processedUser = {
          ...user,
          id: String(user.id),
          managerId: user.managerId ? String(user.managerId) : undefined,
          role: {
            ...user.role,
            id: String(user.role.id),
            permissions: user.role.permissions ? user.role.permissions.map(p => ({
              ...p,
              id: String(p.id),
              role_id: String(p.role_id),
              permission_id: String(p.permission_id),
              permission: p.permission ? {
                ...p.permission,
                id: String(p.permission.id)
              } : p.permission
            })) : []
          }
        };
        return processedUser;
      });

      // Make sure we include the current user in the users array
      const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      if (currentUser && currentUser.id) {
        const currentUserId = String(currentUser.id);
        const userExists = this.users.some(u => String(u.id) === currentUserId);

        if (!userExists) {
          console.log('Adding current user to users array:', {
            id: currentUserId,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role?.name
          });

          // Add the current user to the users array
          this.users.push({
            ...currentUser,
            id: currentUserId,
            managerId: currentUser.managerId ? String(currentUser.managerId) : undefined,
            role: {
              ...currentUser.role,
              id: String(currentUser.role.id),
              permissions: currentUser.role.permissions ? currentUser.role.permissions.map(p => ({
                ...p,
                id: String(p.id),
                role_id: String(p.role_id),
                permission_id: String(p.permission_id),
                permission: p.permission ? {
                  ...p.permission,
                  id: String(p.permission.id)
                } : p.permission
              })) : []
            }
          });
        }
      }

      // Ensure all KPI IDs are strings
      this.kpis = kpis.map(kpi => ({
        ...kpi,
        id: String(kpi.id),
        createdBy: String(kpi.createdBy),
        managerId: kpi.managerId ? String(kpi.managerId) : undefined,
        targetEmployeeId: kpi.targetEmployeeId ? String(kpi.targetEmployeeId) : undefined,
        targetRoleId: kpi.targetRoleId ? String(kpi.targetRoleId) : undefined
      }));

      this.lastRefresh = now;

      // Log the processed users data
      console.log('Processed users data:', {
        count: this.users.length,
        sample: this.users.length > 0 ? this.users.slice(0, 3).map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role.name,
          managerId: u.managerId
        })) : [],
        allUsers: this.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role.name,
          managerId: u.managerId
        }))
      });

      console.log('KPI access control data refreshed successfully', {
        usersCount: this.users.length,
        kpisCount: this.kpis.length
      });
    } catch (error) {
      console.error('Error refreshing KPI access control data:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Determines if a user can view a specific KPI
   */
  canViewKPI(userId: string, kpiId: string): boolean {
    // Normalize IDs to strings for comparison
    const userIdStr = String(userId);
    const kpiIdStr = String(kpiId);

    const user = this.users.find(u => String(u.id) === userIdStr);
    const kpi = this.kpis.find(k => String(k.id) === kpiIdStr);

    if (!user || !kpi) return false;

    // Admin can view all KPIs
    if (user.role.name === 'Admin') return true;

    // Managers can view KPIs they created
    if (user.role.name === 'Manager' && kpi.managerId && String(kpi.managerId) === userIdStr) return true;

    // Employee-specific KPI - only visible to the targeted employee
    if (kpi.type === 'employee-specific' && kpi.targetEmployeeId && String(kpi.targetEmployeeId) === userIdStr) return true;

    // Global KPI - only visible to direct reports of the manager who created it
    if (kpi.type === 'global' && user.managerId && kpi.managerId && String(user.managerId) === String(kpi.managerId)) return true;

    // Role-based KPI - only visible to employees with the targeted role who are direct reports
    if (kpi.type === 'role-based' && 
        kpi.targetRoleId && String(kpi.targetRoleId) === String(user.role.id) &&
        user.managerId && kpi.managerId && String(user.managerId) === String(kpi.managerId)) return true;

    return false;
  }

  /**
   * Gets all KPIs visible to a specific user
   */
  async getVisibleKPIs(userId: string): Promise<KPI[]> {
    await this.refreshData();

    // Normalize ID to string for comparison
    const userIdStr = String(userId);

    const user = this.users.find(u => String(u.id) === userIdStr);
    if (!user) return [];

    // Admin can see all KPIs
    if (user.role.name === 'Admin') return this.kpis;

    // Managers can see KPIs they created
    if (user.role.name === 'Manager') {
      return this.kpis.filter(kpi => 
        (kpi.managerId && String(kpi.managerId) === userIdStr) ||
        (kpi.targetEmployeeId && String(kpi.targetEmployeeId) === userIdStr) // KPIs targeted at the manager
      );
    }

    // Employees can see KPIs assigned to them
    return this.kpis.filter(kpi => {
      // Employee-specific KPIs targeted at this employee
      if (kpi.type === 'employee-specific' && kpi.targetEmployeeId && String(kpi.targetEmployeeId) === userIdStr) return true;

      // Global KPIs created by the employee's manager
      if (kpi.type === 'global' && user.managerId && kpi.managerId && String(user.managerId) === String(kpi.managerId)) return true;

      // Role-based KPIs for the employee's role created by their manager
      if (kpi.type === 'role-based' && 
          kpi.targetRoleId && String(kpi.targetRoleId) === String(user.role.id) &&
          user.managerId && kpi.managerId && String(user.managerId) === String(kpi.managerId)) return true;

      return false;
    });
  }

  /**
   * Checks if an employee is a direct report of a manager
   */
  private isDirectReport(employeeId: string, managerId: string): boolean {
    // Normalize IDs to strings for comparison
    const employeeIdStr = String(employeeId);
    const managerIdStr = String(managerId);

    console.log('Checking if employee is direct report:', { employeeIdStr, managerIdStr });

    // Find the employee in the users array
    const employee = this.users.find(u => String(u.id) === employeeIdStr);

    if (!employee) {
      console.log('Employee not found in isDirectReport check');
      return false;
    }

    // Check if the employee's managerId matches the manager's ID
    const employeeManagerId = employee.managerId ? String(employee.managerId) : undefined;
    const result = !!employeeManagerId && employeeManagerId === managerIdStr;

    console.log('Direct report check result:', {
      result,
      employeeId: employeeIdStr,
      employeeManagerId,
      managerIdStr
    });

    return result;
  }

  /**
   * Checks if an employee is an indirect report of a manager (reports to someone who reports to the manager)
   */
  private isIndirectReport(employeeId: string, managerId: string): boolean {
    // Normalize IDs to strings for comparison
    const employeeIdStr = String(employeeId);
    const managerIdStr = String(managerId);

    console.log('Checking if employee is indirect report:', { employeeIdStr, managerIdStr });

    // Find the employee in the users array
    const employee = this.users.find(u => String(u.id) === employeeIdStr);
    if (!employee) {
      console.log('Employee not found in isIndirectReport check');
      return false;
    }

    // Check if the employee has a manager
    if (!employee.managerId) {
      console.log('Employee has no manager in isIndirectReport check');
      return false;
    }

    // Get the employee's manager ID
    const employeeManagerId = String(employee.managerId);

    // If the employee's manager is the manager we're checking, this is a direct report, not an indirect report
    if (employeeManagerId === managerIdStr) {
      console.log('Employee is a direct report to the manager, not an indirect report');
      return false;
    }

    // Find the employee's manager in the users array
    const employeeManager = this.users.find(u => String(u.id) === employeeManagerId);
    if (!employeeManager) {
      console.log('Employee manager not found in isIndirectReport check:', {
        employeeManagerId,
        usersCount: this.users.length
      });
      return false;
    }

    // Check if the employee's manager reports to the manager in question
    if (employeeManager.managerId) {
      const employeeManagersManagerId = String(employeeManager.managerId);

      // If the employee's manager reports to the manager we're checking, this is an indirect report
      if (employeeManagersManagerId === managerIdStr) {
        console.log('Employee manager reports to the manager, this is an indirect report');
        return true;
      }

      // Recursively check if the employee's manager is an indirect report of the manager
      console.log('Recursively checking if employee manager is an indirect report:', {
        employeeManagerId,
        managerIdStr
      });
      return this.isIndirectReport(employeeManagerId, managerIdStr);
    }

    console.log('Employee manager has no manager, not an indirect report');
    return false;
  }

  /**
   * Checks all permission aspects for KPI access
   */
  async checkPermissions(managerId: string, targetEmployeeId?: string): Promise<PermissionCheck> {
    await this.refreshData();

    // Default permission check result
    const result: PermissionCheck = {
      hasDirectReport: false,
      hasIndirectReport: false,
      isAdmin: false,
      hasKpiWritePermission: false
    };

    // If no target employee, return default permissions
    if (!targetEmployeeId) {
      return result;
    }

    // Normalize IDs to strings for comparison
    const managerIdStr = String(managerId);
    const targetEmployeeIdStr = String(targetEmployeeId);

    // Log detailed information about the users array
    console.log('Users array before finding manager and employee:', {
      usersCount: this.users.length,
      managerIdStr,
      targetEmployeeIdStr
    });

    // Try to get the current user from localStorage if it's the manager we're looking for
    let manager = this.users.find(u => String(u.id) === managerIdStr);
    if (!manager) {
      const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      if (currentUser && String(currentUser.id) === managerIdStr) {
        console.log('Using current user from localStorage as manager:', {
          id: String(currentUser.id),
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role?.name
        });

        // Use the current user as the manager
        manager = {
          ...currentUser,
          id: String(currentUser.id),
          managerId: currentUser.managerId ? String(currentUser.managerId) : undefined,
          role: {
            ...currentUser.role,
            id: String(currentUser.role.id),
            permissions: currentUser.role.permissions ? currentUser.role.permissions.map(p => ({
              ...p,
              id: String(p.id),
              role_id: String(p.role_id),
              permission_id: String(p.permission_id),
              permission: p.permission ? {
                ...p.permission,
                id: String(p.permission.id)
              } : p.permission
            })) : []
          }
        };

        // Add the manager to the users array for future use
        this.users.push(manager);
      }
    }

    // Find the employee
    const employee = this.users.find(u => String(u.id) === targetEmployeeIdStr);

    // If manager or employee doesn't exist, return default permissions
    if (!manager || !employee) {
      console.error('Manager or employee not found', { 
        managerId: managerIdStr, 
        targetEmployeeId: targetEmployeeIdStr,
        managerFound: !!manager,
        employeeFound: !!employee,
        usersCount: this.users.length
      });

      // If we have the employee but not the manager, try to check if the employee's managerId matches
      if (!manager && employee && employee.managerId) {
        console.log('Checking if employee\'s managerId matches the requested managerId:', {
          employeeManagerId: String(employee.managerId),
          requestedManagerId: managerIdStr
        });

        if (String(employee.managerId) === managerIdStr) {
          console.log('Employee\'s managerId matches the requested managerId, setting hasDirectReport to true');
          result.hasDirectReport = true;
        }
      }

      return result;
    }

    // Check if manager is admin
    result.isAdmin = manager.role.name === 'Admin';

    // Check if manager has KPI_WRITE permission
    result.hasKpiWritePermission = hasPermission(manager, PERMISSIONS.KPI_WRITE);

    // Check if employee is a direct report
    result.hasDirectReport = this.isDirectReport(targetEmployeeIdStr, managerIdStr);

    // Check if employee is an indirect report
    result.hasIndirectReport = this.isIndirectReport(targetEmployeeIdStr, managerIdStr);

    // Log the permission check result
    console.log('Permission check result:', {
      managerId: managerIdStr,
      targetEmployeeId: targetEmployeeIdStr,
      isAdmin: result.isAdmin,
      hasKpiWritePermission: result.hasKpiWritePermission,
      hasDirectReport: result.hasDirectReport,
      hasIndirectReport: result.hasIndirectReport
    });

    return result;
  }

  /**
   * Validates if a manager has access to create/update KPIs for a specific employee
   */
  async validateKPIAccess(managerId: string, targetEmployeeId?: string): Promise<boolean> {
    // If no target employee, it's a global KPI which managers can always create
    if (!targetEmployeeId) return true;

    // Normalize IDs to strings for comparison
    const managerIdStr = String(managerId);
    const targetEmployeeIdStr = String(targetEmployeeId);

    console.log('Validating KPI access:', { managerIdStr, targetEmployeeIdStr });

    const permissions = await this.checkPermissions(managerIdStr, targetEmployeeIdStr);

    console.log('Permission check results:', { permissions });

    // Admin can create KPIs for any employee, regardless of KPI_WRITE permission
    if (permissions.isAdmin) {
      console.log('Access granted: User is admin');
      return true;
    }

    // Manager can create KPIs for direct reports, regardless of KPI_WRITE permission
    if (permissions.hasDirectReport) {
      console.log('Access granted: Manager has direct report');
      return true;
    }

    // Manager can create KPIs for indirect reports, regardless of KPI_WRITE permission
    if (permissions.hasIndirectReport) {
      console.log('Access granted: Manager has indirect report');
      return true;
    }

    // Log the permission check result for debugging
    console.log('KPI access denied', { 
      managerId: managerIdStr, 
      targetEmployeeId: targetEmployeeIdStr, 
      permissions 
    });

    return false;
  }
}

// Create a singleton instance
export const kpiAccessControlService = new KPIAccessControlService();
