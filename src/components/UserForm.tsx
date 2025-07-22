import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { mockRoles } from '../data/mockData';
import { X, User, Mail, Lock, UserCheck } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import Tooltip from './ui/Tooltip';

interface UserFormProps {
  onClose: () => void;
  onUserCreated: (user: any) => void;
  editUser?: any;
  users?: any[];
}

const UserForm: React.FC<UserFormProps> = ({ onClose, onUserCreated, editUser, users = [] }) => {
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: editUser?.name || '',
    email: editUser?.email || '',
    password: '',
    roleId: editUser?.role.id || '3',
    managerId: editUser?.managerId || '',
    isActive: editUser?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await apiService.getRoles();
        if (rolesData && rolesData.length > 0) {
          setRoles(rolesData);
        } else {
          console.warn('No roles fetched from API, using mockRoles as fallback');
          setRoles(mockRoles);
        }
      } catch (error: any) {
        console.error('Error fetching roles:', error);
        console.warn('Using mockRoles as fallback due to API error');
        setRoles(mockRoles);
      }
    };

    fetchRoles();
  }, []);

  // Close modal when ESC key is pressed
  useEscapeKey(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editUser) {
        const updatedUser = await apiService.updateUser(editUser.id, {
          ...formData,
          role: roles.find(r => r.id === formData.roleId)!,
        });
        onUserCreated(updatedUser);
      } else {
        // For new users, include the password in the creation
        const newUser = await apiService.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password, // Make sure password is included
          role: roles.find(r => r.id === formData.roleId)!,
          managerId: formData.managerId || undefined,
          isActive: formData.isActive,
        });
        onUserCreated(newUser);
      }
      onClose();
    } catch (err: any) {
      // Extract the specific error message from the error object if available
      const errorMessage = err.message || 'Failed to save user. Please try again.';
      setError(errorMessage);
      console.error('User creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Filter users to find those with Manager or Admin roles
  const potentialManagers = users.filter(user => 
    user.role?.name?.toLowerCase() === 'manager' || user.role?.name?.toLowerCase() === 'admin'
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-2 text-blue-600" />
            {editUser ? 'Edit User' : 'Add New User'}
          </h2>
          <Tooltip text="Close">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </Tooltip>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
              />
            </div>
          </div>

          {!editUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  required={!editUser}
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              name="roleId"
              value={formData.roleId}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager (Optional)
            </label>
            <select
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No Manager</option>
              {potentialManagers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Active User
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Tooltip text="Cancel and close form">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </Tooltip>
            <Tooltip text={editUser ? "Save changes to user" : "Create new user"}>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
              </button>
            </Tooltip>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
