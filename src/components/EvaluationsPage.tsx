import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Evaluation, User, EvaluationCycle } from '../types';
import { BarChart3, Plus, Eye, Edit, Filter, Search, Calendar, Layers } from 'lucide-react';
import EvaluationForm from './EvaluationForm';
import EvaluationCycleForm from './EvaluationCycleForm';
import EvaluationCycleOverview from './EvaluationCycleOverview';
import ErrorBoundary from './ErrorBoundary';

const EvaluationsPage: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [showEvaluationCycleForm, setShowEvaluationCycleForm] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filterManager, setFilterManager] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  const [viewOnly, setViewOnly] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | undefined>();
  const [evaluationCycles, setEvaluationCycles] = useState<EvaluationCycle[]>([]);
  const [filterCycleStatus, setFilterCycleStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'cycles' | 'evaluations'>('cycles');
  const [activeCycle, setActiveCycle] = useState<EvaluationCycle | null>(null);
  const [loadingActiveCycle, setLoadingActiveCycle] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Prepare filters based on current filter state
        const filters: { department?: string; managerId?: string; status?: string } = {};

        if (filterStatus) {
          filters.status = filterStatus;
        }

        if (filterManager) {
          filters.managerId = filterManager;
        }

        // Prepare filters for evaluation cycles
        const cycleFilters: { status?: string } = {};
        if (filterCycleStatus) {
          cycleFilters.status = filterCycleStatus;
        }

        // Fetch evaluations, users, evaluation cycles, and active cycle in parallel
        const [evaluationsData, usersData, cyclesData, activeCycleData] = await Promise.all([
          apiService.getEvaluations(filters),
          apiService.getAllUsers(),
          apiService.getEvaluationCycles(cycleFilters),
          apiService.getActiveEvaluationCycle()
        ]);

        console.log('Fetched users:', usersData); // Add logging
        console.log('Fetched evaluation cycles:', cyclesData); // Add logging
        console.log('Fetched active cycle:', activeCycleData); // Add logging
        setEvaluations(evaluationsData || []); // Ensure we always have an array
        setAllUsers(usersData || []); // Ensure we always have an array
        setEvaluationCycles(cyclesData || []); // Ensure we always have an array
        setActiveCycle(activeCycleData); // Set active cycle (can be null)
      } catch (error) {
        console.error('Error fetching data:', error);
        // Add user-friendly error handling
        setEvaluations([]); // Set empty array for evaluations
        setAllUsers([]); // Set empty array for users
        setEvaluationCycles([]); // Set empty array for evaluation cycles
        setActiveCycle(null); // No active cycle
      } finally {
        setLoading(false);
        setLoadingActiveCycle(false);
      }
    };

    fetchData();
  }, [filterStatus, filterManager, filterCycleStatus]); // Re-fetch when filters change

  // Only apply search filtering client-side since backend handles role and status filtering
  const filteredEvaluations = evaluations.filter(evaluation => {
    // Add null checks to prevent errors
    if (!evaluation) return false;

    // Only filter by search term (period) client-side
    return evaluation.period?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
  });

  // Get direct reports for managers, exclude manager's own name
  const directReports = user?.role.name?.toLowerCase() === 'manager'
    ? allUsers.filter(u => u.managerId === user.id && u.id !== user.id)
    : [];

  // Get managers for filter dropdown
  const managers = allUsers.filter(u => u.role.name?.toLowerCase() === 'manager');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    if (score >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canCreateEvaluation = user?.role.name?.toLowerCase() === 'admin' || user?.role.name?.toLowerCase() === 'manager';

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
            Evaluations
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {user?.role.name?.toLowerCase() === 'employee'
              ? 'View your performance evaluations and feedback.'
              : 'Manage employee evaluations and performance reviews.'}
          </p>
        </div>
        {/* Hide "+ Create" button for managers */}
        {canCreateEvaluation && user?.role.name?.toLowerCase() === 'admin' && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
            <button
              onClick={() => setShowEvaluationCycleForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
            >
              <Calendar className="h-4 w-4 mr-2"/>
              Create Cycle
            </button>
          </div>
        )}
      </div>
      
      {/* Active Cycle Notification */}
      {!loadingActiveCycle && (
        <>
          {activeCycle ? (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Active Evaluation Cycle: {activeCycle.name}</span>
                    <br />
                    <span className="text-xs">
                      Period: {new Date(activeCycle.evaluationStartDate).toLocaleDateString()} - {new Date(activeCycle.evaluationEndDate).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">No active evaluation cycle found.</span>
                    <br />
                    <span className="text-xs">
                      {user?.role.name?.toLowerCase() === 'admin' 
                        ? 'Create a new evaluation cycle to start evaluations.' 
                        : 'Please contact an administrator to create an evaluation cycle.'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        {/* Search - available for all roles */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by period..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status filter - available for all roles */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Manager filter - admin only */}
        {user?.role.name?.toLowerCase() === 'admin' && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Managers</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Department filter - admin only */}
        {user?.role.name?.toLowerCase() === 'admin' && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              onChange={(e) => {
                // Update department filter and refetch data
                const filters = { department: e.target.value, managerId: filterManager, status: filterStatus };
                apiService.getEvaluations(filters).then(data => setEvaluations(data || []));
              }}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
            </select>
          </div>
        )}

        {/* Employee filter - manager only */}
        {user?.role.name?.toLowerCase() === 'manager' && directReports.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value || undefined);
                // If an employee is selected, fetch their evaluations
                if (e.target.value) {
                  apiService.getEmployeeEvaluations(e.target.value, 1, 10, { status: filterStatus })
                    .then(data => setEvaluations(data.items || []));
                } else {
                  // Otherwise, fetch all evaluations for the manager's team
                  apiService.getEvaluations({ status: filterStatus })
                    .then(data => setEvaluations(data || []));
                }
              }}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Team Members</option>
              {directReports.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>


      {/* Grid View */}
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evaluation Period
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {user?.role.name?.toLowerCase() === 'admin' || user?.role.name?.toLowerCase() === 'manager'
              ? allUsers.filter(u => u.role.name?.toLowerCase() !== 'admin').map(employee => {
                  // Find evaluation for this employee
                  const evaluation = filteredEvaluations.find(e => e.employeeId === employee.id);

                  return (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{evaluation?.period || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {evaluation ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(evaluation.status)}`}>
                            {evaluation.status}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            No Evaluation
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {evaluation ? (
                          <div className={`text-sm font-medium ${getScoreColor(evaluation.normalizedScore)}`}>
                            {evaluation.kpiEvaluations && evaluation.kpiEvaluations.some(kpi => kpi.rating > 0)
                              ? evaluation.normalizedScore.toFixed(1)
                              : 'N/A'}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {evaluation?.status === 'pending' && activeCycle && (
                          <button 
                            onClick={() => {
                              setSelectedEvaluationId(evaluation.id);
                              setViewOnly(false);
                              setShowEvaluationForm(true);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Start
                          </button>
                        )}

                        {evaluation?.status === 'draft' && (
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedEvaluationId(evaluation.id);
                                setViewOnly(true);
                                setShowEvaluationForm(true);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                            {canCreateEvaluation && (
                              <button 
                                onClick={() => {
                                  setSelectedEvaluationId(evaluation.id);
                                  setViewOnly(false);
                                  setShowEvaluationForm(true);
                                }}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </button>
                            )}
                          </div>
                        )}

                        {evaluation && (evaluation.status === 'submitted' || evaluation.status === 'approved' || evaluation.status === 'rejected') && (
                          <button 
                            onClick={() => {
                              setSelectedEvaluationId(evaluation.id);
                              setViewOnly(true);
                              setShowEvaluationForm(true);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              : user?.role.name?.toLowerCase() === 'manager'
                ? directReports.map(employee => {
                    // Find evaluation for this employee
                    const evaluation = filteredEvaluations.find(e => e.employeeId === employee.id);

                    if (!evaluation) return null;

                    return (
                      <tr key={evaluation.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee?.name || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{evaluation.period}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(evaluation.status)}`}>
                            {evaluation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getScoreColor(evaluation.normalizedScore)}`}>
                            {evaluation.normalizedScore.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Show different buttons based on status */}
                          {evaluation.status === 'pending' && activeCycle && (
                            <button 
                              onClick={() => {
                                setSelectedEvaluationId(evaluation.id);
                                setViewOnly(false);
                                setShowEvaluationForm(true);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Start
                            </button>
                          )}

                          {evaluation.status === 'draft' && (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => {
                                  setSelectedEvaluationId(evaluation.id);
                                  setViewOnly(true);
                                  setShowEvaluationForm(true);
                                }}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </button>
                              {canCreateEvaluation && (
                                <button 
                                  onClick={() => {
                                    setSelectedEvaluationId(evaluation.id);
                                    setViewOnly(false);
                                    setShowEvaluationForm(true);
                                  }}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </button>
                              )}
                            </div>
                          )}

                          {(evaluation.status === 'submitted' || evaluation.status === 'approved' || evaluation.status === 'rejected') && (
                            <button 
                              onClick={() => {
                                setSelectedEvaluationId(evaluation.id);
                                setViewOnly(true);
                                setShowEvaluationForm(true);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                : filteredEvaluations.map((evaluation) => {
                    // Find employee name
                    const employee = allUsers.find(u => u.id === evaluation.employeeId);

                    return (
                      <tr key={evaluation.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{employee?.name || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{evaluation.period}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(evaluation.status)}`}>
                            {evaluation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getScoreColor(evaluation.normalizedScore)}`}>
                            {evaluation.normalizedScore.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Show different buttons based on status */}
                          {evaluation.status === 'pending' && activeCycle && (
                            <button 
                              onClick={() => {
                                setSelectedEvaluationId(evaluation.id);
                                setViewOnly(false);
                                setShowEvaluationForm(true);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Start
                            </button>
                          )}

                          {evaluation.status === 'draft' && (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => {
                                  setSelectedEvaluationId(evaluation.id);
                                  setViewOnly(true);
                                  setShowEvaluationForm(true);
                                }}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </button>
                              {canCreateEvaluation && (
                                <button 
                                  onClick={() => {
                                    setSelectedEvaluationId(evaluation.id);
                                    setViewOnly(false);
                                    setShowEvaluationForm(true);
                                  }}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </button>
                              )}
                            </div>
                          )}

                          {(evaluation.status === 'submitted' || evaluation.status === 'approved' || evaluation.status === 'rejected') && (
                            <button 
                              onClick={() => {
                                setSelectedEvaluationId(evaluation.id);
                                setViewOnly(true);
                                setShowEvaluationForm(true);
                              }}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
            }
          </tbody>
        </table>
      </div>

      {filteredEvaluations.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No evaluations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus ? 'Try adjusting your search criteria.' : 
             canCreateEvaluation ? 'Get started by creating a new evaluation.' : 'No evaluations available yet.'}
          </p>
        </div>
      )}

      {/* Evaluation Cycles Section - Only visible to admins */}
      {user?.role.name?.toLowerCase() === 'admin' && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4">
            <Calendar className="h-6 w-6 mr-3 text-blue-600" />
            Evaluation Cycles
          </h2>
          <p className="mt-2 text-sm text-gray-700 mb-4">
            Manage evaluation cycles and track progress across the organization.
          </p>

          {/* Cycle filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filterCycleStatus}
                onChange={(e) => setFilterCycleStatus(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <ErrorBoundary>
            <EvaluationCycleOverview 
              cycles={evaluationCycles}
              onCycleActivated={(updatedCycle) => {
                // Update the cycle in the state
                setEvaluationCycles(prevCycles => 
                  prevCycles.map(cycle => 
                    cycle.id === updatedCycle.id ? updatedCycle : cycle
                  )
                );

                // Refresh evaluations to get the newly created ones
                apiService.getEvaluations().then(data => {
                  setEvaluations(data || []);
                });
              }}
              onCyclePaused={(updatedCycle) => {
                // Update the cycle in the state
                setEvaluationCycles(prevCycles => 
                  prevCycles.map(cycle => 
                    cycle.id === updatedCycle.id ? updatedCycle : cycle
                  )
                );
              }}
              onCycleStopped={(updatedCycle) => {
                // Update the cycle in the state
                setEvaluationCycles(prevCycles => 
                  prevCycles.map(cycle => 
                    cycle.id === updatedCycle.id ? updatedCycle : cycle
                  )
                );
              }}
              onCycleDeleted={(cycleId) => {
                // Remove the cycle from the state
                setEvaluationCycles(prevCycles => 
                  prevCycles.filter(cycle => cycle.id !== cycleId)
                );
              }}
            />
          </ErrorBoundary>
        </div>
      )}

      {showEvaluationForm && (
        <ErrorBoundary>
          <EvaluationForm
            onClose={() => {
              setShowEvaluationForm(false);
              setViewOnly(false);
              setSelectedEmployeeId(undefined);
              setSelectedEvaluationId(undefined);
            }}
            employeeId={selectedEmployeeId}
            evaluationId={selectedEvaluationId}
            users={allUsers}
            currentUser={user}
            viewOnly={viewOnly}
          />
        </ErrorBoundary>
      )}

      {showEvaluationCycleForm && (
        <ErrorBoundary>
          <EvaluationCycleForm 
            onClose={() => setShowEvaluationCycleForm(false)}
            onSuccess={(newCycle) => {
              // Add the new cycle to the state
              setEvaluationCycles(prevCycles => [...prevCycles, newCycle]);
              // Close the form
              setShowEvaluationCycleForm(false);
            }}
            currentUser={user}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

// Wrap the component with ErrorBoundary for graceful error handling

// Export the component wrapped with ErrorBoundary
export default function EvaluationsPageWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <EvaluationsPage />
    </ErrorBoundary>
  );
};
