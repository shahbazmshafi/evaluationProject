import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { KPI, User as UserType, Role } from '../types';
import { Target, Plus, Edit, Trash2, Search, Filter, Archive, Eye, SortAsc, SortDesc, List, User } from 'lucide-react';
import KPIForm from './KPIForm';

const KPIsPage: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'managed'>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const isManager = user?.role.name?.toLowerCase() === 'manager';
  const isAdmin = user?.role.name?.toLowerCase() === 'admin';
  const canManageKPIs = isAdmin || isManager;

  useEffect(() => {
    // Fetch users and roles when the component mounts
    const fetchUsersAndRoles = async () => {
      try {
        const [usersData, rolesData] = await Promise.all([
          apiService.getAllUsers(),
          apiService.getRoles()
        ]);
        setUsers(usersData);
        setRoles(rolesData);
      } catch (error) {
        console.error('Error fetching users and roles:', error);
      }
    };

    fetchUsersAndRoles();
  }, []); // Only run once when component mounts

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    try {
      let kpisData;

      if (activeTab === 'managed' && (isManager || isAdmin)) {
        // Fetch KPIs created by the current manager with filters
        kpisData = await apiService.getManagerKPIs({
          status: filterStatus || undefined,
          type: filterScope || undefined,
          sortBy: sortBy
        });
      } else {
        // Fetch all KPIs
        kpisData = await apiService.getKPIs();
      }

      // Enhance KPI data with additional information
      const enhancedKPIs = kpisData.map(kpi => {
        const enhancedKPI = { ...kpi };

        // Add creator role information
        const creator = users.find(u => u.id.toString() === kpi.createdBy);
        if (creator && creator.role) {
          enhancedKPI.creatorRole = creator.role.name;
        }

        // Add target role name for role-based KPIs
        if (kpi.type === 'role-based' && kpi.targetRoleId) {
          const targetRole = roles.find(r => r.id.toString() === kpi.targetRoleId);
          if (targetRole) {
            enhancedKPI.targetRoleName = targetRole.name;
          }
        }

        // Add target employee name for employee-specific KPIs
        if (kpi.type === 'employee-specific' && kpi.targetEmployeeId) {
          const targetEmployee = users.find(u => u.id.toString() === kpi.targetEmployeeId);
          if (targetEmployee) {
            enhancedKPI.targetEmployeeName = targetEmployee.name;
          }
        }

        return enhancedKPI;
      });

      setKPIs(enhancedKPIs);
    } catch (error: any) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus, filterScope, sortBy, isManager, isAdmin, users, roles]);

  useEffect(() => {
    // Only fetch KPIs when we have users and roles data
    if (users.length > 0 && roles.length > 0) {
      fetchKPIs();
    }
  }, [users, roles, fetchKPIs]);

  // Filter KPIs based on search term and filters
  let filteredKPIs = kpis.filter(kpi => {
    const matchesSearch = kpi.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.description.toLowerCase().includes(searchTerm.toLowerCase());

    // In the managed tab, filtering is handled by the backend
    // In the all tab, we need to apply filters client-side
    const matchesType = activeTab === 'managed' || !filterScope || kpi.type === filterScope;
    const matchesStatus = activeTab === 'managed' || !filterStatus || kpi.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Apply client-side sorting for the "All KPIs" tab
  // For the "My KPIs" tab, sorting is handled by the backend
  if (activeTab === 'all') {
    filteredKPIs.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else {
        // Default to created_at
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  const handleDeleteKPI = useCallback(async (kpiId: string) => {
    if (window.confirm('Are you sure you want to delete this KPI?')) {
      try {
        await apiService.deleteKPI(kpiId);
        // Refresh the KPI list to ensure we have the latest data
        fetchKPIs();
      } catch (error: any) {
        console.error('Error deleting KPI:', error);
      }
    }
  }, [fetchKPIs]);

  const handleArchiveKPI = useCallback(async (kpiId: string) => {
    try {
      await apiService.updateKPI(kpiId, { status: 'archived' });
      // Refresh the KPI list to ensure we have the latest data
      fetchKPIs();
    } catch (error: any) {
      console.error('Error archiving KPI:', error);
    }
  }, [fetchKPIs]);

  const handleKPICreated = useCallback((newKPI: KPI) => {
    // Close the form
    setShowCreateForm(false);
    setEditingKPI(null);

    // Refresh the KPI list to ensure we have the latest data
    fetchKPIs();

    // If we're in the "All KPIs" tab and the user just created a KPI,
    // switch to the "My KPIs" tab to show their newly created KPI
    if (activeTab === 'all' && !editingKPI && canManageKPIs) {
      setActiveTab('managed');
    }
  }, [fetchKPIs, activeTab, editingKPI, canManageKPIs, setActiveTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // This is now defined earlier in the component

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Target className="h-8 w-8 mr-3 text-blue-600" />
            KPI Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage Key Performance Indicators for evaluations.
          </p>
        </div>
        {canManageKPIs && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button 
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add KPI
            </button>
          </div>
        )}
      </div>

      {/* Tabs - Only show for managers and admins */}
      {canManageKPIs && (
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <List className="h-5 w-5 mr-2" />
              All KPIs
            </button>
            <button
              onClick={() => setActiveTab('managed')}
              className={`${
                activeTab === 'managed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <User className="h-5 w-5 mr-2" />
              My KPIs
            </button>
          </nav>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search KPIs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Scopes</option>
            <option value="global">Global</option>
            <option value="role-based">Role-based</option>
            <option value="employee-specific">Employee-specific</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Sorting controls - Only show in managed tab */}
        {activeTab === 'managed' && (
          <>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {sortDirection === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </button>
          </>
        )}
      </div>

      {/* KPIs Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredKPIs.map((kpi) => (
          <div key={kpi.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      kpi.status === 'active' ? 'bg-green-100 text-green-800' :
                      kpi.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {kpi.status}
                    </span>
                  </div>
                </div>
                {canManageKPIs && (
                  <div className="flex items-center space-x-1">
                    <button className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setEditingKPI(kpi)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleArchiveKPI(kpi.id)}
                      className="p-1 text-gray-400 hover:text-yellow-600 rounded-md hover:bg-yellow-50 transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteKPI(kpi.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{kpi.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{kpi.description}</p>

              {/* Additional KPI Information */}
              <div className="mb-4">
                {kpi.creatorRole && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Created by: </span>
                    <span>{kpi.creatorRole}</span>
                  </div>
                )}

                <div className="text-xs text-gray-600 mb-1">
                  <span className="font-medium">KPI Scope: </span>
                  <span>{kpi.type}</span>
                </div>

                <div className="text-xs text-gray-600 mb-1">
                  <span className="font-medium">KPI Type: </span>
                  <span>{kpi.isTechnical ? "Technical" : "Administrative / HR"}</span>
                </div>

                {kpi.type === 'employee-specific' && kpi.targetEmployeeName && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Assigned to: </span>
                    <span>{kpi.targetEmployeeName}</span>
                  </div>
                )}

                {kpi.type === 'role-based' && kpi.targetRoleName && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Assigned to role: </span>
                    <span>{kpi.targetRoleName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{kpi.weightage}%</div>
                    <div className="text-xs text-gray-500">Weight</div>
                  </div>
                  <div className="text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      Scope: {kpi.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredKPIs.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No KPIs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterScope || filterStatus ? 'Try adjusting your search criteria.' : 'Get started by creating a new KPI.'}
          </p>
        </div>
      )}

      {/* KPI Form Modal */}
      {(showCreateForm || editingKPI) && (
        <KPIForm
          onClose={() => {
            setShowCreateForm(false);
            setEditingKPI(null);
          }}
          onKPICreated={handleKPICreated}
          editKPI={editingKPI}
        />
      )}
    </div>
  );
};

export default KPIsPage;
