import React, { useState, useEffect } from 'react';
import { Role, Permission, RolePermission } from '../types';
import { apiService } from '../services/api';
import { X, Check, Shield, Eye, Plus, Edit, Trash2, BarChart3, Users, Target, Settings } from 'lucide-react';

interface RolePermissionsFormProps {
  role: Role;
  allPermissions: Permission[];
  onClose: () => void;
  onPermissionsUpdated: (role: Role) => void;
}

// Interface for module permissions
interface ModulePermissions {
  name: string;
  displayName: string;
  icon: React.ElementType;
  permissions: {
    view?: Permission;
    add?: Permission;
    update?: Permission;
    delete?: Permission;
    approve?: Permission;
  };
}

const RolePermissionsForm: React.FC<RolePermissionsFormProps> = ({
  role,
  allPermissions,
  onClose,
  onPermissionsUpdated
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Function to find the correct role permission ID
  const findRolePermissionId = (rolePermissions: RolePermission[], permissionName: string): number => {
    const rolePermission = rolePermissions.find(rp => rp.permission.name === permissionName);
    return rolePermission?.id || -1;
  };

  // Initialize selected permissions based on the role's current permissions
  useEffect(() => {
    setSelectedPermissions(role.permissions.map(p => String(p.permission.id)));
  }, [role]);

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get current permissions
      const currentPermissionIds = role.permissions.map(p => String(p.permission.id));

      // Permissions to add
      const permissionsToAdd = selectedPermissions.filter(
        id => !currentPermissionIds.includes(id)
      );

      // Permissions to remove
      const permissionsToRemove = currentPermissionIds.filter(
        id => !selectedPermissions.includes(id)
      );

      // Add new permissions
      for (const permissionId of permissionsToAdd) {
        await apiService.addPermissionToRole(role.id, permissionId);
      }

      // Remove permissions
      for (const permissionId of permissionsToRemove) {
        // Find the permission name from all permissions
        const permission = allPermissions.find(p => String(p.id) === permissionId);
        if (permission) {
          try {
            // Use the apiService to remove the permission
            await apiService.removePermissionFromRole(role.id, permissionId);
          } catch (error) {
            console.error('Failed to remove permission:', error);
            throw error;
          }
        }
      }

      // Get updated role with new permissions
      const updatedRole = await apiService.getRole(role.id);

      setSuccess(true);
      onPermissionsUpdated(updatedRole);
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      setError(error.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  // Organize permissions by module and action
  const modulePermissions: ModulePermissions[] = [
    {
      name: 'USER',
      displayName: 'Users',
      icon: Eye,
      permissions: {}
    },
    {
      name: 'KPI',
      displayName: 'KPIs',
      icon: Eye,
      permissions: {}
    },
    {
      name: 'EVALUATION',
      displayName: 'Evaluations',
      icon: Eye,
      permissions: {}
    },
    {
      name: 'NAVIGATION',
      displayName: 'Navigation Access',
      icon: Shield,
      permissions: {}
    }
  ];

  // Populate module permissions
  allPermissions.forEach(permission => {
    // Handle navigation permissions separately
    if (permission.name.endsWith('_VIEW') && 
        (permission.name.startsWith('DASHBOARD_') || 
         permission.name.startsWith('EVALUATION_VIEW') || 
         permission.name.startsWith('KPI_VIEW') || 
         permission.name.startsWith('USERS_VIEW') || 
         permission.name.startsWith('ROLE_MANAGEMENT_VIEW') || 
         permission.name.startsWith('SETTINGS_VIEW'))) {
      const navigationModule = modulePermissions.find(mp => mp.name === 'NAVIGATION');
      if (navigationModule) {
        // Use the permission as a view permission
        if (permission.name === 'DASHBOARD_VIEW') {
          navigationModule.permissions.view = permission;
        } else if (permission.name === 'EVALUATION_VIEW') {
          navigationModule.permissions.add = permission;
        } else if (permission.name === 'KPI_VIEW') {
          navigationModule.permissions.update = permission;
        } else if (permission.name === 'USERS_VIEW') {
          navigationModule.permissions.delete = permission;
        } else if (permission.name === 'ROLE_MANAGEMENT_VIEW') {
          navigationModule.permissions.approve = permission;
        }
      }
    } else {
      // Handle regular permissions
      const [module, action] = permission.name.split('_');
      const modulePermission = modulePermissions.find(mp => mp.name === module);

      if (modulePermission) {
        if (action === 'READ') {
          modulePermission.permissions.view = permission;
        } else if (action === 'WRITE') {
          modulePermission.permissions.add = permission;
          modulePermission.permissions.update = permission;
        } else if (action === 'DELETE') {
          modulePermission.permissions.delete = permission;
        } else if (action === 'APPROVE') {
          modulePermission.permissions.approve = permission;
        }
      }
    }
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Manage Permissions for {role.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-md text-sm">
            Permissions updated successfully
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Select the permissions you want to grant to this role.
          </p>
          <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>View:</strong> User can see the module and view its content</li>
              <li><strong>Add:</strong> User can add new records to the module</li>
              <li><strong>Update:</strong> User can modify existing records in the module</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          {modulePermissions.map((module) => (
            <div key={module.name} className="border rounded-md p-4">
              <h3 className="font-medium text-gray-900 mb-3 text-lg flex items-center">
                <module.icon className="h-5 w-5 mr-2 text-blue-600" />
                {module.displayName}
              </h3>

              {module.name === 'NAVIGATION' ? (
                // Special rendering for Navigation permissions
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {/* Dashboard */}
                  {module.permissions.view && (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">Dashboard</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.view.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.view.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.view.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Evaluations */}
                  {module.permissions.add && (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <Target className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">Evaluations</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.add.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.add.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.add.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* KPIs */}
                  {module.permissions.update && (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <BarChart3 className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">KPIs</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.update.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.update.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.update.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Users */}
                  {module.permissions.delete && (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">Users</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.delete.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.delete.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.delete.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Role Management */}
                  {module.permissions.approve && (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        <Shield className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">Role Management</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.approve.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.approve.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.approve.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Settings - Note: This is always allowed according to requirements */}
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Settings className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="font-medium text-gray-700 mb-2">Settings</div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded opacity-50"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Always allowed</div>
                  </div>
                </div>
              ) : (
                // Standard rendering for other modules
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="font-medium text-gray-700 mb-2">View</div>
                    {module.permissions.view && (
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.view.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.view.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.view.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Plus className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="font-medium text-gray-700 mb-2">Add</div>
                    {module.permissions.add && (
                      <div className="flex justify-center">
                        <input
                          id={`permission-add-${module.name}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.add.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.add.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!module.permissions.view || !selectedPermissions.includes(String(module.permissions.view.id))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Edit className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="font-medium text-gray-700 mb-2">Update</div>
                    {module.permissions.update && (
                      <div className="flex justify-center">
                        <input
                          id={`permission-update-${module.name}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.update.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.update.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!module.permissions.view || !selectedPermissions.includes(String(module.permissions.view.id))}
                        />
                      </div>
                    )}
                  </div>

                  {module.permissions.delete && (
                    <div className="text-center col-span-3 md:col-span-1 mt-4 md:mt-0">
                      <div className="flex justify-center mb-2">
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">Delete</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.delete.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.delete.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.delete.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!module.permissions.view || !selectedPermissions.includes(String(module.permissions.view.id))}
                        />
                      </div>
                    </div>
                  )}

                  {module.permissions.approve && (
                    <div className="text-center col-span-3 md:col-span-1 mt-4 md:mt-0">
                      <div className="flex justify-center mb-2">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="font-medium text-gray-700 mb-2">Approve</div>
                      <div className="flex justify-center">
                        <input
                          id={`permission-${module.permissions.approve.id}`}
                          type="checkbox"
                          checked={selectedPermissions.includes(String(module.permissions.approve.id))}
                          onChange={() => handleTogglePermission(String(module.permissions.approve.id))}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!module.permissions.view || !selectedPermissions.includes(String(module.permissions.view.id))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsForm;
