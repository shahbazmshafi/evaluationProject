import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { KPI } from '../types';
import { Target, Plus, Edit, Trash2, Search, Filter, Archive, Eye } from 'lucide-react';
import ManagerKPIForm from './ManagerKPIForm';
import ManagerKPIView from './ManagerKPIView';

const ManagerKPIList: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPI | null>(null);
  const [viewingKPI, setViewingKPI] = useState<KPI | null>(null);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const kpisData = await apiService.getManagerKPIs();
        setKPIs(kpisData);
      } catch (error: any) {
        console.error('Error fetching manager KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  const filteredKPIs = kpis.filter(kpi => {
    const matchesSearch = kpi.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || kpi.type === filterType;
    const matchesStatus = !filterStatus || kpi.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDeleteKPI = async (kpiId: string) => {
    if (window.confirm('Are you sure you want to delete this KPI?')) {
      try {
        await apiService.deleteManagerKPI(kpiId);
        setKPIs(kpis.filter(k => k.id !== kpiId));
      } catch (error: any) {
        console.error('Error deleting KPI:', error);
        alert(`Failed to delete KPI: ${error.message}`);
      }
    }
  };

  const handleArchiveKPI = async (kpiId: string) => {
    try {
      const updatedKPI = await apiService.updateManagerKPI(kpiId, { status: 'archived' });
      setKPIs(kpis.map(k => k.id === kpiId ? updatedKPI : k));
    } catch (error: any) {
      console.error('Error archiving KPI:', error);
      alert(`Failed to archive KPI: ${error.message}`);
    }
  };

  const handleKPICreated = (newKPI: KPI) => {
    if (editingKPI) {
      setKPIs(kpis.map(k => k.id === newKPI.id ? newKPI : k));
      setEditingKPI(null);
    } else {
      setKPIs([...kpis, newKPI]);
    }
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only managers can access this page
  const isManager = user?.role.name?.toLowerCase() === 'manager';
  if (!isManager) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You need manager permissions to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Target className="h-8 w-8 mr-3 text-blue-600" />
            Technical KPI Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage Technical Key Performance Indicators for your team members.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Technical KPI
          </button>
        </div>
      </div>

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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
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
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setViewingKPI(kpi)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  >
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
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{kpi.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{kpi.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{kpi.weightage}%</div>
                    <div className="text-xs text-gray-500">Weight</div>
                  </div>
                  <div className="text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {kpi.type}
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Technical KPIs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType || filterStatus ? 'Try adjusting your search criteria.' : 'Get started by creating a new technical KPI.'}
          </p>
        </div>
      )}

      {/* KPI Form Modal */}
      {(showCreateForm || editingKPI) && (
        <ManagerKPIForm
          onClose={() => {
            setShowCreateForm(false);
            setEditingKPI(null);
          }}
          onKPICreated={handleKPICreated}
          editKPI={editingKPI}
        />
      )}

      {/* KPI View Modal */}
      {viewingKPI && (
        <ManagerKPIView
          kpi={viewingKPI}
          onClose={() => setViewingKPI(null)}
        />
      )}
    </div>
  );
};

export default ManagerKPIList;