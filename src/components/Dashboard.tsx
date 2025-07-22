import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Evaluation, KPI, User, EvaluationCycle } from '../types';
import { BarChart3, Users, Target, TrendingUp, Clock, CheckCircle, Plus, ArrowRight, AlertTriangle, Calendar } from 'lucide-react';
import EvaluationForm from './EvaluationForm';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeCycles, setActiveCycles] = useState<EvaluationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evaluationsData, kpisData, usersData, cyclesData] = await Promise.all([
          apiService.getEvaluations(),
          apiService.getKPIs(),
          apiService.getUsers(),
          apiService.getEvaluationCycles({ status: 'active' }),
        ]);
        setEvaluations(evaluationsData);
        setKPIs(kpisData);
        setUsers(usersData);
        setActiveCycles(cyclesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatsForRole = () => {
    const isAdmin = user?.role.name?.toLowerCase() === 'admin';
    const isManager = user?.role.name?.toLowerCase() === 'manager';

    if (isAdmin) {
      return [
        {
          title: 'Total Users',
          value: users.length,
          icon: Users,
          color: 'bg-blue-500',
          change: '+12%',
          link: '/users',
        },
        {
          title: 'Active KPIs',
          value: kpis.filter(k => k.status === 'active').length,
          icon: Target,
          color: 'bg-green-500',
          change: '+8%',
          link: '/kpis',
        },
        {
          title: 'Evaluations',
          value: evaluations.length,
          icon: BarChart3,
          color: 'bg-purple-500',
          change: '+15%',
          link: '/evaluations',
        },
        {
          title: 'Pending Approvals',
          value: evaluations.filter(e => e.status === 'submitted').length,
          icon: Clock,
          color: 'bg-yellow-500',
          change: '-5%',
          link: '/evaluations?status=submitted',
        },
      ];
    }

    if (isManager) {
      const teamMembers = users.filter(u => u.managerId === user?.id);
      return [
        {
          title: 'Team Members',
          value: teamMembers.length,
          icon: Users,
          color: 'bg-blue-500',
          change: '+2%',
          link: '/users',
        },
        {
          title: 'Pending Reviews',
          value: evaluations.filter(e => e.managerId === user?.id && e.status === 'submitted').length,
          icon: Clock,
          color: 'bg-yellow-500',
          change: '+3%',
          link: '/evaluations?status=pending',
        },
        {
          title: 'Completed Reviews',
          value: evaluations.filter(e => e.managerId === user?.id && e.status === 'approved').length,
          icon: CheckCircle,
          color: 'bg-green-500',
          change: '+18%',
          link: '/evaluations?status=completed',
        },
        {
          title: 'Team Avg Score',
          value: '4.2',
          icon: TrendingUp,
          color: 'bg-purple-500',
          change: '+5%',
          link: '/evaluations',
        },
      ];
    }

    const myEvaluations = evaluations.filter(e => e.employeeId === user?.id);
    return [
      {
        title: 'My Evaluations',
        value: myEvaluations.length,
        icon: BarChart3,
        color: 'bg-blue-500',
        change: '+1%',
        link: '/evaluations',
      },
      {
        title: 'Current Score',
        value: myEvaluations.length > 0 ? myEvaluations[0].normalizedScore.toFixed(1) : '0.0',
        icon: TrendingUp,
        color: 'bg-green-500',
        change: '+12%',
        link: '/evaluations',
      },
      {
        title: 'KPIs to Review',
        value: kpis.filter(k => k.status === 'active').length,
        icon: Target,
        color: 'bg-purple-500',
        change: '0%',
        link: '/kpis',
      },
      {
        title: 'Pending Actions',
        value: myEvaluations.filter(e => e.status === 'draft').length,
        icon: Clock,
        color: 'bg-yellow-500',
        change: '-2%',
        link: '/evaluations?status=draft',
      },
    ];
  };

  const stats = getStatsForRole();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Here's an overview of your evaluation dashboard
          </p>
        </div>

        {user?.role.name?.toLowerCase() !== 'employee' && (
          <button
            onClick={() => setShowEvaluationForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Evaluation
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            to={stat.link}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3 group-hover:scale-105 transition-transform duration-200`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                      {stat.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.change.startsWith('+') ? 'text-green-600' : 
                        stat.change.startsWith('-') ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Evaluation Cycle */}
      {activeCycles.length > 0 && (
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Active Evaluation Cycle
                </h3>
              </div>
              
              {activeCycles.map((cycle) => (
                <div key={cycle.id} className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-medium text-gray-900">{cycle.name}</h4>
                      <p className="text-sm text-gray-500">
                        Ends on {new Date(cycle.evaluationEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {cycle.remainingDays !== undefined && (
                      <div className={`
                        px-4 py-2 rounded-lg flex items-center
                        ${cycle.remainingDays <= 2 ? 'bg-red-100 text-red-800' : 
                          cycle.remainingDays <= 5 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-blue-100 text-blue-800'}
                      `}>
                        <div className="mr-2">
                          {cycle.remainingDays <= 2 ? 
                            <AlertTriangle className="h-5 w-5" /> : 
                            <Calendar className="h-5 w-5" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            {cycle.remainingDays} {cycle.remainingDays === 1 ? 'day' : 'days'} remaining
                          </p>
                          {cycle.remainingDays <= 5 && (
                            <p className="text-xs">
                              {cycle.remainingDays <= 2 ? 'Critical! Complete your evaluation now.' : 'Please complete your evaluation soon.'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Evaluations
              </h3>
              <Link
                to="/evaluations"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {evaluations.slice(0, 5).map((evaluation) => (
                <div key={evaluation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {evaluation.period}
                      </p>
                      <p className="text-sm text-gray-500">
                        Score: {evaluation.normalizedScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      evaluation.status === 'approved' ? 'bg-green-100 text-green-800' :
                      evaluation.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {evaluation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Active KPIs
              </h3>
              <Link
                to="/kpis"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {kpis.filter(k => k.status === 'active').slice(0, 5).map((kpi) => (
                <div key={kpi.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Target className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {kpi.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        Weight: {kpi.weightage}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {kpi.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showEvaluationForm && (
        <EvaluationForm onClose={() => setShowEvaluationForm(false)} />
      )}
    </div>
  );
};

export default Dashboard;
