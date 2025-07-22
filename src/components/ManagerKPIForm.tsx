import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { X, Target, FileText, Percent, Users } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import Tooltip from './ui/Tooltip';
import { User, KPI } from '../types';
import { kpiAccessControlService } from '../services/kpi_access_control';
import KPIAccessIndicator from './KPIAccessIndicator';

interface ManagerKPIFormProps {
  onClose: () => void;
  onKPICreated: (kpi: KPI) => void;
  editKPI?: KPI;
}

const ManagerKPIForm: React.FC<ManagerKPIFormProps> = ({ onClose, onKPICreated, editKPI }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: editKPI?.title || '',
    description: editKPI?.description || '',
    weightage: editKPI?.weightage || 0,
    type: editKPI?.type || 'global',
    targetRoleId: editKPI?.targetRoleId || '',
    targetEmployeeId: editKPI?.targetEmployeeId || '',
    status: editKPI?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [weightageInfo, setWeightageInfo] = useState<{ admin_weightage: number, manager_weightage: number, total_weightage: number } | null>(null);
  const [loadingWeightage, setLoadingWeightage] = useState(false);

  // Close modal when ESC key is pressed
  useEscapeKey(onClose);

  // Fetch employees for the dropdown
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      // This will get only direct reports for managers
      // The backend already filters users based on the user's role
      const allUsers = await apiService.getUsers();

      // Filter only active employees
      const activeEmployees = allUsers.filter(employee => employee.isActive);
      setEmployees(activeEmployees);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch roles for the dropdown
  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      // This will get only roles of direct reports for managers
      // The backend already filters roles based on the user's role
      const allRoles = await apiService.getRoles();
      setRoles(allRoles.map(role => ({ id: role.id.toString(), name: role.name })));
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Function to fetch KPI weightage information for an employee
  const fetchEmployeeWeightage = async (employeeId: string) => {
    try {
      setLoadingWeightage(true);
      const weightage = await apiService.getEmployeeKPIWeightage(employeeId);
      setWeightageInfo(weightage);
    } catch (err) {
      console.error('Failed to fetch employee KPI weightage:', err);
      setWeightageInfo(null);
    } finally {
      setLoadingWeightage(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    fetchEmployees();
    fetchRoles();

    // If editing an employee-specific KPI, fetch the weightage information
    if (editKPI && editKPI.type === 'employee-specific' && editKPI.targetEmployeeId) {
      fetchEmployeeWeightage(editKPI.targetEmployeeId);
    }
  }, [user, editKPI]);

  // Fetch weightage information when target employee changes
  useEffect(() => {
    if (formData.type === 'employee-specific' && formData.targetEmployeeId) {
      fetchEmployeeWeightage(formData.targetEmployeeId);
    } else {
      // Clear weightage info if not employee-specific
      setWeightageInfo(null);
    }
  }, [formData.type, formData.targetEmployeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate weightage
    if (formData.weightage <= 0 || formData.weightage > 100) {
      setError('Weightage must be between 1 and 100');
      setLoading(false);
      return;
    }

    // Validate access control for employee-specific KPIs
    if (formData.type === 'employee-specific' && formData.targetEmployeeId) {
      const hasAccess = kpiAccessControlService.validateKPIAccess(
        user!.id,
        formData.targetEmployeeId
      );

      if (!hasAccess) {
        setError('You do not have permission to create KPIs for this employee');
        setLoading(false);
        return;
      }
    }

    try {
      if (editKPI) {
        const updatedKPI = await apiService.updateManagerKPI(editKPI.id, formData);
        onKPICreated(updatedKPI);
      } else {
        const newKPI = await apiService.createManagerKPI({
          ...formData,
          createdBy: user!.id,
        });
        onKPICreated(newKPI);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save KPI. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Target className="h-6 w-6 mr-2 text-blue-600" />
            {editKPI ? 'Edit Technical KPI' : 'Add New Technical KPI'}
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
              KPI Title
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Target className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter KPI title"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this KPI measures..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weightage (%)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Percent className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="weightage"
                required
                min="1"
                max="100"
                value={formData.weightage}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter weightage percentage"
              />
            </div>

            {/* Display weightage information if available */}
            {weightageInfo && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current KPI Weightage Distribution:</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total:</span>
                    <div className="flex items-center">
                      <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${weightageInfo.total_weightage > 100 ? 'bg-red-500' : 'bg-purple-500'}`}
                          style={{ width: `${Math.min(weightageInfo.total_weightage, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`ml-2 text-xs font-medium ${weightageInfo.total_weightage > 100 ? 'text-red-600' : ''}`}>
                        {weightageInfo.total_weightage.toFixed(1)}% / 100%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Display existing KPIs if available */}
                {weightageInfo.kpis && weightageInfo.kpis.length > 0 && (
                  <div className="mt-2">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Existing KPIs:</h5>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="text-xs text-gray-600 space-y-1">
                        {weightageInfo.kpis.map((kpi) => (
                          <li key={kpi.id} className="flex justify-between">
                            <span>{kpi.title}</span>
                            <span>{kpi.weightage}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Available weightage: {(100 - weightageInfo.total_weightage).toFixed(1)}%
                    </div>
                  </div>
                )}

                {/* Validation warning */}
                {weightageInfo.total_weightage + formData.weightage > 100 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    <strong>Error:</strong> Adding this KPI would exceed the 100% total weightage limit.
                  </div>
                )}
              </div>
            )}

            {formData.type === 'employee-specific' && !formData.targetEmployeeId && (
              <p className="mt-2 text-xs text-gray-500">
                Select an employee to see current weightage distribution.
              </p>
            )}

            {loadingWeightage && (
              <div className="mt-2 text-xs text-gray-500 flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading weightage information...
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KPI Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="global">Global (All Team Members)</option>
              <option value="role-based">Role-based</option>
              <option value="employee-specific">Employee-specific</option>
            </select>

            <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-600 font-medium mb-1">Visibility:</p>
              <KPIAccessIndicator 
                kpi={{
                  ...formData,
                  id: editKPI?.id || 'new',
                  createdAt: editKPI?.createdAt || new Date().toISOString(),
                  createdBy: user?.id || '',
                  category: 'technical',
                  managerId: user?.id,
                  isTechnical: true
                }} 
                teamMembers={employees}
              />
            </div>
          </div>

          {formData.type === 'role-based' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  name="targetRoleId"
                  value={formData.targetRoleId}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingRoles}
                >
                  <option value="">
                    {loadingRoles ? 'Loading roles...' : 'Select a role'}
                  </option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {formData.type === 'employee-specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Employee
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  name="targetEmployeeId"
                  value={formData.targetEmployeeId}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingEmployees}
                >
                  <option value="">
                    {loadingEmployees ? 'Loading employees...' : 'Select an employee'}
                  </option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              {employees.length === 0 && !loadingEmployees && (
                <p className="mt-1 text-sm text-red-500">
                  No active team members available for selection.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
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
            <Tooltip text={editKPI ? "Save changes to KPI" : "Create new technical KPI"}>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editKPI ? 'Update KPI' : 'Create KPI'}
              </button>
            </Tooltip>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManagerKPIForm;
