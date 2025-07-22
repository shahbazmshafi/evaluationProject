import React, { useState, useEffect } from 'react';
import { Shield, Users, Key, Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface GranularPermission {
  id: number;
  module_name: string;
  action_name: string;
  permission_key: string;
  display_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  module_name: string;
  action_name: string;
  is_active: boolean;
  granted_by: number;
  granted_at: string;
  expires_at?: string;
}

interface UserWithPermissions {
  user_id: number;
  user_name: string;
  user_email: string;
  permissions: UserPermission[];
}

interface AccessControlSummary {
  total_users: number;
  total_granular_permissions: number;
  active_user_permissions: number;
  modules_with_permissions: string[];
}

const AccessControlPage: React.FC = () => {
  const [summary, setSummary] = useState<AccessControlSummary | null>(null);
  const [granularPermissions, setGranularPermissions] = useState<GranularPermission[]>([]);
  const [usersWithPermissions, setUsersWithPermissions] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreatePermissionForm, setShowCreatePermissionForm] = useState(false);
  const [newPermission, setNewPermission] = useState({
    module_name: '',
    action_name: '',
    display_name: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Fetch summary
      const summaryResponse = await fetch('/api/access-control/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch granular permissions
      const permissionsResponse = await fetch('/api/access-control/granular-permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch users with permissions
      const usersResponse = await fetch('/api/access-control/users-with-permissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setGranularPermissions(permissionsData);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsersWithPermissions(usersData);
      }

    } catch (err) {
      console.error('Error fetching access control data:', err);
      setError('Failed to load access control data');
    } finally {
      setLoading(false);
    }
  };

  const createGranularPermission = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/access-control/granular-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPermission)
      });

      if (response.ok) {
        setShowCreatePermissionForm(false);
        setNewPermission({ module_name: '', action_name: '', display_name: '', description: '' });
        fetchData(); // Refresh data
      } else {
        setError('Failed to create permission');
      }
    } catch (err) {
      setError('Error creating permission');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Granular Access Control
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage fine-grained permissions for individual users beyond their role-based access.
            </p>
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full inline-block">
              ⚠️ Super Admin Only - This module operates separately from role-based permissions
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.total_users}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Key className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Granular Permissions</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.total_granular_permissions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Assignments</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.active_user_permissions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Modules</dt>
                      <dd className="text-lg font-medium text-gray-900">{summary.modules_with_permissions.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Granular Permissions Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Granular Permissions
                </h3>
                <button
                  onClick={() => setShowCreatePermissionForm(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Permission
                </button>
              </div>

              <div className="space-y-3">
                {granularPermissions.map((permission) => (
                  <div key={permission.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{permission.display_name}</h4>
                        <p className="text-sm text-gray-600">{permission.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {permission.permission_key}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            permission.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {permission.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {granularPermissions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Key className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2">No granular permissions defined yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Users with Permissions Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Users with Granular Permissions
              </h3>

              <div className="space-y-4">
                {usersWithPermissions.map((userWithPermissions) => (
                  <div key={userWithPermissions.user_id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{userWithPermissions.user_name}</h4>
                        <p className="text-sm text-gray-600">{userWithPermissions.user_email}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {userWithPermissions.permissions.length} permissions
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {userWithPermissions.permissions.slice(0, 3).map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between text-xs">
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {permission.module_name}.{permission.action_name}
                          </span>
                          {permission.expires_at && (
                            <span className="text-orange-600 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires
                            </span>
                          )}
                        </div>
                      ))}
                      {userWithPermissions.permissions.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{userWithPermissions.permissions.length - 3} more permissions
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {usersWithPermissions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2">No users have granular permissions assigned yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Permission Modal */}
      {showCreatePermissionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Granular Permission</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Module Name</label>
                  <input
                    type="text"
                    value={newPermission.module_name}
                    onChange={(e) => setNewPermission({ ...newPermission, module_name: e.target.value })}
                    placeholder="e.g., users, kpis, evaluations"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Action Name</label>
                  <input
                    type="text"
                    value={newPermission.action_name}
                    onChange={(e) => setNewPermission({ ...newPermission, action_name: e.target.value })}
                    placeholder="e.g., read, write, delete, approve"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={newPermission.display_name}
                    onChange={(e) => setNewPermission({ ...newPermission, display_name: e.target.value })}
                    placeholder="Human readable name"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newPermission.description}
                    onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                    placeholder="Describe what this permission allows"
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreatePermissionForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={createGranularPermission}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Create Permission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControlPage;