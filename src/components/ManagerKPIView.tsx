import React, { useEffect, useState } from 'react';
import { X, Target, Percent, Users, Calendar, User } from 'lucide-react';
import { KPI } from '../types';
import { apiService } from '../services/api';
import useEscapeKey from '../hooks/useEscapeKey';
import Tooltip from './ui/Tooltip';

interface ManagerKPIViewProps {
  kpi: KPI;
  onClose: () => void;
}

const ManagerKPIView: React.FC<ManagerKPIViewProps> = ({ kpi, onClose }) => {
  const [targetRoleName, setTargetRoleName] = useState<string>('');
  const [targetEmployeeName, setTargetEmployeeName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Close modal when ESC key is pressed
  useEscapeKey(onClose);

  useEffect(() => {
    const fetchRelatedData = async () => {
      setLoading(true);
      try {
        // Fetch role name if target role is specified
        if (kpi.targetRoleId) {
          try {
            const roles = await apiService.getRoles();
            const role = roles.find(r => r.id === kpi.targetRoleId);
            if (role) {
              setTargetRoleName(role.name);
            }
          } catch (error) {
            console.error('Error fetching role:', error);
          }
        }

        // Fetch employee name if target employee is specified
        if (kpi.targetEmployeeId) {
          try {
            const users = await apiService.getAllUsers();
            const employee = users.find(u => u.id === kpi.targetEmployeeId);
            if (employee) {
              setTargetEmployeeName(employee.name);
            }
          } catch (error) {
            console.error('Error fetching employee:', error);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedData();
  }, [kpi.targetRoleId, kpi.targetEmployeeId]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Target className="h-6 w-6 mr-2 text-blue-600" />
            Technical KPI Details
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

        <div className="px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{kpi.title}</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    kpi.status === 'active' ? 'bg-green-100 text-green-800' :
                    kpi.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {kpi.status}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {kpi.type}
                  </span>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    Technical
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{kpi.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Percent className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Weightage</div>
                    <div className="text-base font-semibold text-gray-900">{kpi.weightage}%</div>
                  </div>
                </div>

                {kpi.type === 'role-based' && kpi.targetRoleId && (
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">Target Role</div>
                      <div className="text-base font-semibold text-gray-900">{targetRoleName || 'Loading...'}</div>
                    </div>
                  </div>
                )}

                {kpi.type === 'employee-specific' && kpi.targetEmployeeId && (
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">Target Employee</div>
                      <div className="text-base font-semibold text-gray-900">{targetEmployeeName || 'Loading...'}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Created At</div>
                    <div className="text-base font-semibold text-gray-900">
                      {new Date(kpi.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerKPIView;