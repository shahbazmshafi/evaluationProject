import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { KPI, KPIEvaluation, Evaluation, User, EvaluationCycle } from '../types';
import { Save, Send, Star, Shield, Download, BarChart } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import Tooltip from './ui/Tooltip';
import ScorePreview from './ScorePreview';

interface EvaluationFormProps {
  onClose: () => void;
  employeeId?: string;
  evaluationId?: string;
  users?: User[];
  currentUser?: User | null;
  viewOnly?: boolean;
}

const EvaluationForm: React.FC<EvaluationFormProps> = ({ onClose, employeeId, evaluationId, users, currentUser, viewOnly }) => {
  const { user: authUser } = useAuth();
  const user = currentUser || authUser;
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [kpiEvaluations, setKPIEvaluations] = useState<KPIEvaluation[]>([]);
  const [comments, setComments] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [adminComments, setAdminComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(!users);
  const [allUsers, setAllUsers] = useState<User[]>(users || []);
  const [saving, setSaving] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [employee, setEmployee] = useState<User | null>(null);
  const [activeCycle, setActiveCycle] = useState<EvaluationCycle | null>(null);
  const [loadingCycle, setLoadingCycle] = useState(true);

  // Determine user role for field visibility
  const isManager = user?.role?.permissions?.some(p => p?.permission?.name === 'manage_evaluations') || false;
  const isAdmin = user?.role?.permissions?.some(p => p?.permission?.name === 'admin_evaluations') || false;

  // Close modal when ESC key is pressed
  useEscapeKey(onClose);

  // Fetch users if not provided as props
  useEffect(() => {
    const fetchUsers = async () => {
      if (!users) {
        try {
          setLoadingUsers(true);
          const fetchedUsers = await apiService.getAllUsers();
          setAllUsers(fetchedUsers || []);
        } catch (error) {
          console.error('Error fetching users:', error);
          setAllUsers([]);
        } finally {
          setLoadingUsers(false);
        }
      }
    };

    fetchUsers();
  }, [users]);
  
  // Fetch active evaluation cycle
  useEffect(() => {
    const fetchActiveCycle = async () => {
      try {
        setLoadingCycle(true);
        const cycle = await apiService.getActiveEvaluationCycle();
        setActiveCycle(cycle);
      } catch (error) {
        console.error('Error fetching active evaluation cycle:', error);
        setActiveCycle(null);
      } finally {
        setLoadingCycle(false);
      }
    };

    fetchActiveCycle();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (evaluationId) {
          // Fetch evaluation and its KPI evaluations from backend
          const foundEvaluation = await apiService.getEvaluation(String(evaluationId));

          if (foundEvaluation) {
            setEvaluation(foundEvaluation);
            
            // Handle both backend (snake_case) and frontend (camelCase) formats
            const backendResponse = foundEvaluation as any;
            const kpiEvals = foundEvaluation.kpiEvaluations || backendResponse.kpi_evaluations || [];
            
            setKPIEvaluations(kpiEvals);
            setComments(foundEvaluation.comments || '');
            setManagerComments(foundEvaluation.managerComments || backendResponse.manager_comments || '');
            setAdminComments(foundEvaluation.adminComments || backendResponse.admin_comments || '');

            // If this is a pending evaluation with no KPI evaluations, fetch the employee's assigned KPIs
            if (foundEvaluation.status === 'pending' && kpiEvals.length === 0) {
              try {
                // Use employee_id from backend response (snake_case) or employeeId from frontend (camelCase)
                const employeeIdForKPIs = backendResponse.employee_id || foundEvaluation.employeeId;
                const employeeKPIs = await apiService.getEmployeeKPIs(String(employeeIdForKPIs));
                setKPIs(employeeKPIs || []);

                // Initialize KPI evaluations for the pending evaluation
                const initialEvaluations: KPIEvaluation[] = (employeeKPIs || []).map(kpi => ({
                  kpiId: kpi.id,
                  title: kpi.title,
                  description: kpi.description,
                  category: kpi.category,
                  weightage: kpi.weightage,
                  rating: 0.0,
                  comment: '',
                }));
                setKPIEvaluations(initialEvaluations);
              } catch (error) {
                console.error('Error fetching employee KPIs for pending evaluation:', error);
                setKPIs([]);
                setKPIEvaluations([]);
              }
            } else {
              // For existing evaluations with KPI data, set the KPIs from the evaluation
              setKPIs(kpiEvals.map(kpi => ({
                id: kpi.kpiId,
                title: kpi.title,
                description: kpi.description,
                category: kpi.category,
                weightage: kpi.weightage,
                type: 'global', // Default type since we don't have this info
                status: 'active',
                createdBy: '1',
                createdAt: new Date().toISOString(),
                isTechnical: kpi.category === 'technical'
              })));
            }

            // Find employee in the users array or fetch if not available
            let foundEmployee: User | undefined;
            const employeeIdForUser = backendResponse.employee_id || foundEvaluation.employeeId;

            if (allUsers.length > 0) {
              foundEmployee = allUsers.find(u => u.id.toString() === employeeIdForUser);
            } else if (!loadingUsers) {
              // Only fetch if we're not already loading users
              const fetchedUsers = await apiService.getAllUsers();
              setAllUsers(fetchedUsers || []);
              foundEmployee = fetchedUsers?.find(u => u.id.toString() === employeeIdForUser);
            }

            if (foundEmployee) {
              setEmployee(foundEmployee);
            }
          }
        } else if (employeeId) {
          // If employeeId is provided, fetch the employee and their KPIs
          try {
            // Find employee in the users array or fetch if not available
            let foundEmployee: User | undefined;

            if (allUsers.length > 0) {
              foundEmployee = allUsers.find(u => u.id.toString() === employeeId);
            } else if (!loadingUsers) {
              // Only fetch if we're not already loading users
              const fetchedUsers = await apiService.getAllUsers();
              setAllUsers(fetchedUsers || []);
              foundEmployee = fetchedUsers?.find(u => u.id.toString() === employeeId);
            }

            if (foundEmployee) {
              setEmployee(foundEmployee);

              // Fetch employee-specific KPIs (includes global, role-based, and employee-specific)
              const employeeKPIs = await apiService.getEmployeeKPIs(employeeId);
              setKPIs(employeeKPIs || []);

              // Initialize KPI evaluations for a new evaluation
              const initialEvaluations: KPIEvaluation[] = (employeeKPIs || []).map(kpi => ({
                kpiId: kpi.id,
                title: kpi.title,
                description: kpi.description,
                category: kpi.category,
                weightage: kpi.weightage,
                rating: 0.0,
                comment: '',
              }));
              setKPIEvaluations(initialEvaluations);

              // Handle case where employee has no KPIs
              if (employeeKPIs.length === 0) {
                console.log('No KPIs found for this employee');
              }
            } else {
              console.error('Employee not found');
              // Set empty arrays instead of falling back to all KPIs
              setKPIs([]);
              setKPIEvaluations([]);
            }
          } catch (error) {
            console.error('Error fetching employee data:', error);
            // Set empty arrays to prevent undefined errors
            setKPIs([]);
            setKPIEvaluations([]);
          }
        } else {
          // If neither employeeId nor evaluationId is provided, fetch all active KPIs
          const kpisData = await apiService.getKPIs();
          const activeKPIs = (kpisData || []).filter(k => k.status === 'active');
          setKPIs(activeKPIs);

          const initialEvaluations: KPIEvaluation[] = activeKPIs.map(kpi => ({
            kpiId: kpi.id,
            title: kpi.title,
            description: kpi.description,
            category: kpi.category,
            weightage: kpi.weightage,
            rating: 0.0,
            comment: '',
          }));
          setKPIEvaluations(initialEvaluations);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set empty arrays to prevent undefined errors
        setKPIs([]);
        setKPIEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if users are loaded or provided as props
    if (!loadingUsers) {
      fetchData();
    }
  }, [employeeId, evaluationId, allUsers, loadingUsers]);

  const updateRating = (kpiId: string, rating: number) => {
    setKPIEvaluations(prev => 
      prev.map(e => e.kpiId === kpiId ? { ...e, rating } : e)
    );
  };

  const updateComment = (kpiId: string, comment: string) => {
    setKPIEvaluations(prev => 
      prev.map(e => e.kpiId === kpiId ? { ...e, comment } : e)
    );
  };

  // Calculate progress of KPI ratings
  const progress = useMemo(() => {
    if (kpiEvaluations.length === 0) return 0;

    // Count KPIs with valid ratings (between 0.0 and 5.0)
    const ratedKPIs = kpiEvaluations.filter(kpi => kpi.rating >= 0.0 && kpi.rating <= 5.0).length;
    return {
      percentage: Math.round((ratedKPIs / kpiEvaluations.length) * 100),
      ratedCount: ratedKPIs,
      totalCount: kpiEvaluations.length,
      remainingCount: kpiEvaluations.length - ratedKPIs
    };
  }, [kpiEvaluations]);

  // Calculate scores for the evaluation
  const calculateScores = () => {
    // Use the API service to calculate scores
    const rawScore = apiService.calculateRawScore(kpiEvaluations);
    const normalizedScore = apiService.calculateNormalizedScore(rawScore);
    const performanceLabel = apiService.getPerformanceLabel(normalizedScore);
    const incrementPercentage = apiService.calculateIncrementPercentage(normalizedScore);

    // Calculate technical and admin scores separately
    const technicalKPIs = kpiEvaluations.filter(kpi => kpi.category === 'technical');
    const adminKPIs = kpiEvaluations.filter(kpi => kpi.category === 'admin');

    const technicalScore = technicalKPIs.length > 0 
      ? apiService.calculateRawScore(technicalKPIs) 
      : 0;

    const adminScore = adminKPIs.length > 0 
      ? apiService.calculateRawScore(adminKPIs) 
      : 0;

    return { 
      rawScore,
      technicalScore, 
      adminScore, 
      normalizedScore, 
      performanceLabel,
      incrementPercentage 
    };
  };

  const handleSave = async (status: 'draft' | 'submitted') => {
    setSaving(true);
    try {
      // Validate form data
      if (!kpiEvaluations || kpiEvaluations.length === 0) {
        throw new Error('No KPIs to evaluate');
      }

      // Check if all KPIs have been rated
      const unratedKPIs = kpiEvaluations.filter(kpi => kpi.rating === 0);
      if (status === 'submitted' && unratedKPIs.length > 0) {
        if (!confirm(`You have ${unratedKPIs.length} unrated KPIs. Do you want to continue with submission?`)) {
          setSaving(false);
          return;
        }
      }

      // Get the current quarter and year for the period
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      const year = now.getFullYear();
      const period = evaluation?.period || `${year}-Q${quarter}`;

      // Ensure user is defined before accessing its id
      if (!user || !user.id) {
        throw new Error('User information is missing');
      }

      // Use the active cycle ID if available
      const cycleId = activeCycle ? activeCycle.id : undefined;
      
      if (!cycleId && status === 'submitted') {
        // Show warning if submitting without an active cycle
        if (!confirm('No active evaluation cycle found. Continue anyway?')) {
          setSaving(false);
          return;
        }
      }

      // Ensure all required fields are present
      if (!employeeId && !user.id) {
        throw new Error('Employee ID is required');
      }

      if (!user.id) {
        throw new Error('Manager ID is required');
      }

      // Map KPI evaluations to backend shape
      const mappedKpiEvaluations = kpiEvaluations.map(kpi => ({
        kpi_id: Number(kpi.kpiId),
        title: kpi.title,
        description: kpi.description,
        category: kpi.category,
        weightage: kpi.weightage,
        rating: kpi.rating,
        comment: kpi.comment,
      }));

      const evaluationData = {
        employee_id: Number(employeeId || user.id),
        manager_id: Number(user.id),
        period,
        cycle_id: cycleId ? Number(cycleId) : undefined,
        kpi_evaluations: mappedKpiEvaluations,
        status,
        comments,
        manager_comments: isManager ? managerComments : undefined,
        admin_comments: isAdmin ? adminComments : undefined,
        drafted_by: status === 'draft' ? Number(user.id) : undefined
      };

      let result;
      if (evaluation?.id || evaluationId) {
        // Update existing evaluation (PUT)
        const id = String(evaluation?.id || evaluationId);
        result = await apiService.updateEvaluation(id, evaluationData as any);
      } else {
        // Create new evaluation (POST)
        result = await apiService.createEvaluation(evaluationData as any);
      }

      console.log('Evaluation saved successfully:', result);

      // Show success message
      const message = status === 'draft' 
        ? 'Draft saved successfully!' 
        : 'Evaluation submitted successfully!';
      alert(message);
      onClose();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      alert(`Failed to save evaluation: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingUsers || loadingCycle) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="text-center mt-4 text-gray-600">
            {loadingUsers 
              ? 'Loading users...' 
              : loadingCycle 
                ? 'Loading evaluation cycle...' 
                : 'Loading evaluation data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
         <h2 className="text-2xl font-bold text-gray-900">
            {employee?.name ? `${employee.name} Evaluation` : 'Employee Evaluation'}
          </h2>
          {employee && (
            <div className="mt-1 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                {employee.role.name}
              </span>
              <span className="text-gray-600 text-sm">{employee.email}</span>
            </div>
          )}
          {/* Evaluation Cycle Information */}
          {activeCycle ? (
            <div className="mt-2 mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium">
                Active Evaluation Cycle: {activeCycle.name}
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                  {activeCycle.status}
                </span>
              </p>
              <p className="text-green-700 text-xs">
                Period: {new Date(activeCycle.evaluationStartDate).toLocaleDateString()} - {new Date(activeCycle.evaluationEndDate).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="mt-2 mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                <strong>Warning:</strong> No active evaluation cycle found. This evaluation will not be associated with any cycle.
              </p>
            </div>
          )}
          {/* Progress tracking */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Completion Progress</span>
              <span className="text-sm font-medium text-gray-700">
                {kpiEvaluations.length > 0
                  ? `${Math.round((kpiEvaluations.filter(kpi => kpi.rating > 0).length / kpiEvaluations.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  kpiEvaluations.length === 0
                    ? 'bg-red-500'
                    : kpiEvaluations.filter(kpi => kpi.rating > 0).length < kpiEvaluations.length
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`} 
                style={{ width: kpiEvaluations.length > 0 ? `${(kpiEvaluations.filter(kpi => kpi.rating > 0).length / kpiEvaluations.length) * 100}%` : '0%' }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {kpiEvaluations.length === 0
                ? 'No KPIs to rate'
                : kpiEvaluations.filter(kpi => kpi.rating > 0).length < kpiEvaluations.length
                  ? `${kpiEvaluations.length - kpiEvaluations.filter(kpi => kpi.rating > 0).length} of ${kpiEvaluations.length} KPIs still need rating`
                  : 'All KPIs have been rated'}
            </p>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-6">
            {kpis.length === 0 ? (
              <div className="bg-yellow-50 rounded-lg p-8 text-center">
                <div className="text-yellow-600 text-xl mb-2">No KPIs Found</div>
                <p className="text-gray-600">
                  There are no KPIs assigned to this employee. Please assign KPIs before proceeding with the evaluation.
                </p>
              </div>
            ) : (
              kpis.map((kpi) => {
                const kpiEval = kpiEvaluations.find(e => e.kpiId === kpi.id);
                return (
                  <div key={kpi.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{kpi.title}</h3>
                        <p className="text-gray-600 text-sm">{kpi.description}</p>
                        <div className="flex space-x-2 mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Weight: {kpi.weightage}%
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            kpi.category === 'technical' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {kpi.category === 'technical' ? 'Technical' : 'Administrative'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            kpi.type === 'global' ? 'bg-gray-100 text-gray-800' : 
                            kpi.type === 'role-based' ? 'bg-indigo-100 text-indigo-800' : 
                            'bg-pink-100 text-pink-800'
                          }`}>
                            {kpi.type === 'global' ? 'Global' : 
                             kpi.type === 'role-based' ? 'Role-based' : 
                             'Employee-specific'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="relative w-full max-w-xs">
                          <input
                            type="number"
                            min="0.0"
                            max="5.0"
                            step="0.1"
                            value={kpiEval?.rating || 0.0}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value >= 0.0 && value <= 5.0) {
                                updateRating(kpi.id, Math.round(value * 10) / 10);
                              }
                            }}
                            className={`w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              kpiEval && kpiEval.rating >= 0.0 && kpiEval.rating <= 5.0
                                ? 'border-gray-300'
                                : 'border-red-500'
                            }`}
                            aria-label="Rating value between 0.0 and 5.0"
                            disabled={
                              (kpi.created_by_role === 'admin' && !isAdmin) ||
                              (kpi.created_by_role === 'manager' && !isManager)
                            }
                          />
                          <span className="ml-2 text-sm text-gray-600">/ 5.0</span>
                        </div>
                        <Tooltip text="Ratings must be between 0.0 and 5.0 with 0.1 precision">
                          <div className="text-xs text-gray-500 italic">
                            Enter a value from 0.0 to 5.0
                          </div>
                        </Tooltip>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comments (optional)
                      </label>
                      <textarea
                        value={kpiEval?.comment || ''}
                        onChange={(e) => updateComment(kpi.id, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Add your comments here..."
                        disabled={
                          (kpi.created_by_role === 'admin' && !isAdmin) ||
                          (kpi.created_by_role === 'manager' && !isManager)
                        }
                      />
                    </div>
                  </div>
                );
              })
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Overall Comments</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add overall evaluation comments..."
              />
            </div>

            {isManager && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Manager Comments</h3>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Manager Only
                  </span>
                </div>
                <textarea
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Add manager-only comments..."
                />
              </div>
            )}

            {/* Show admin comments section if user is admin or has permission to view admin comments */}
            {(isAdmin || (evaluation?.permissions?.can_view_admin_comments)) && (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Admin Comments</h3>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Admin Only
                  </span>
                </div>
                {/* Only allow editing if user is admin */}
                {isAdmin ? (
                  <textarea
                    value={adminComments}
                    onChange={(e) => setAdminComments(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Add admin-only comments..."
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    {adminComments || "No admin comments available."}
                  </div>
                )}
              </div>
            )}

            {/* Improved Score Summary Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Score Summary</h3>
              <div className="mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">KPI</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiEvaluations.map((kpi, idx) => (
                      <tr key={kpi.kpiId || idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-2 py-2 flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${kpi.rating > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="text-sm text-gray-800">{kpi.title}</span>
                        </td>
                        <td className="px-2 py-2 text-right text-sm text-gray-700 font-medium">{kpi.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Calculate scores in real time */}
              {(() => {
                const rawScore = apiService.calculateRawScore(kpiEvaluations);
                const normalizedScore = apiService.calculateNormalizedScore(rawScore);
                const performanceLabel = apiService.getPerformanceLabel(normalizedScore);
                return (
                  <div className="mt-8 flex flex-col items-center">
                    <div className="w-full max-w-xs bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Raw Score</span>
                        <span className="text-lg font-bold text-gray-900">{rawScore.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Normalized Score</span>
                        <span className="text-lg font-bold text-blue-700">{normalizedScore.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                      <span className={`inline-block px-6 py-2 rounded-full text-2xl font-bold shadow-sm ${
                        performanceLabel === 'Outstanding' ? 'bg-green-100 text-green-700' :
                        performanceLabel === 'Exceeds Expectations' ? 'bg-blue-100 text-blue-700' :
                        performanceLabel === 'Meets Expectations' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {performanceLabel}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Hide action buttons in view-only mode */}
        {!viewOnly && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <Tooltip text="Cancel and close form">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </Tooltip>
            <Tooltip text={kpis.length === 0 ? "Cannot save - no KPIs to evaluate" : "Save evaluation as draft to complete later"}>
              <button
                onClick={() => handleSave('draft')}
                disabled={saving || kpis.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </button>
            </Tooltip>
            <Tooltip text={kpis.length === 0 ? "Cannot submit - no KPIs to evaluate" : "Submit completed evaluation"}>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving || kpis.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Evaluation
              </button>
            </Tooltip>
          </div>
        )}
        {/* Show close button only in view-only mode */}
        {viewOnly && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationForm;
