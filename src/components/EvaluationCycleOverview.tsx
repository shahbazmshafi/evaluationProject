import React, { useState } from 'react';
import { EvaluationCycle } from '../types';
import { apiService } from '../services/api';
import NotificationService from '../services/NotificationService';
import { Calendar, CheckCircle, Clock, Download, Pause, Play, RefreshCw, Square, Trash2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EvaluationCycleOverviewProps {
  cycles: EvaluationCycle[];
  onCycleActivated: (cycle: EvaluationCycle) => void;
  onCyclePaused: (cycle: EvaluationCycle) => void;
  onCycleStopped: (cycle: EvaluationCycle) => void;
  onCycleDeleted: (cycleId: string) => void;
}

const EvaluationCycleOverview: React.FC<EvaluationCycleOverviewProps> = ({ 
  cycles, 
  onCycleActivated,
  onCyclePaused,
  onCycleStopped,
  onCycleDeleted 
}) => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async (cycleId: string) => {
    setLoading(prev => ({ ...prev, [cycleId]: true }));
    setError(null);

    try {
      const updatedCycle = await apiService.activateEvaluationCycle(cycleId);

      // Send notifications to managers about the activated cycle
      try {
        await NotificationService.notifyCycleActivation(updatedCycle);

        // Schedule a reminder for 7 days before the deadline
        const executionEndDate = new Date(updatedCycle.executionEndDate);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((executionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline > 7) {
          // Set a reminder for 7 days before the deadline
          const reminderDays = daysUntilDeadline - 7;
          setTimeout(() => {
            NotificationService.sendDeadlineReminders(updatedCycle, 7);
          }, reminderDays * 24 * 60 * 60 * 1000); // Convert days to milliseconds
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Continue with the flow even if notifications fail
      }

      onCycleActivated(updatedCycle);
    } catch (err) {
      console.error('Error activating cycle:', err);
      setError(err instanceof Error ? err.message : 'Failed to activate evaluation cycle');
    } finally {
      setLoading(prev => ({ ...prev, [cycleId]: false }));
    }
  };

  const handlePause = async (cycleId: string) => {
    if (!window.confirm('Are you sure you want to pause this evaluation cycle?')) {
      return;
    }

    setLoading(prev => ({ ...prev, [cycleId]: true }));
    setError(null);

    try {
      const updatedCycle = await apiService.pauseEvaluationCycle(cycleId);
      onCyclePaused(updatedCycle);
    } catch (err) {
      console.error('Error pausing cycle:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause evaluation cycle');
    } finally {
      setLoading(prev => ({ ...prev, [cycleId]: false }));
    }
  };

  const handleStop = async (cycleId: string) => {
    if (!window.confirm('Are you sure you want to stop this evaluation cycle? This action cannot be undone.')) {
      return;
    }

    setLoading(prev => ({ ...prev, [cycleId]: true }));
    setError(null);

    try {
      const updatedCycle = await apiService.stopEvaluationCycle(cycleId);
      onCycleStopped(updatedCycle);
    } catch (err) {
      console.error('Error stopping cycle:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop evaluation cycle');
    } finally {
      setLoading(prev => ({ ...prev, [cycleId]: false }));
    }
  };

  const handleDelete = async (cycleId: string) => {
    if (!window.confirm('Are you sure you want to delete this evaluation cycle?')) {
      return;
    }

    setLoading(prev => ({ ...prev, [cycleId]: true }));
    setError(null);

    try {
      await apiService.deleteEvaluationCycle(cycleId);
      onCycleDeleted(cycleId);
    } catch (err) {
      console.error('Error deleting cycle:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete evaluation cycle');
    } finally {
      setLoading(prev => ({ ...prev, [cycleId]: false }));
    }
  };

  const exportCycleData = (cycle: EvaluationCycle) => {
    // Create CSV content
    const csvContent = [
      ['Cycle Name', 'Status', 'Evaluation Period', 'Execution Period', 'Total Evaluations', 'Completed', 'Progress'],
      [
        cycle.name,
        cycle.status,
        `${format(new Date(cycle.evaluationStartDate), 'MMM d, yyyy')} - ${format(new Date(cycle.evaluationEndDate), 'MMM d, yyyy')}`,
        `${format(new Date(cycle.executionStartDate), 'MMM d, yyyy')} - ${format(new Date(cycle.executionEndDate), 'MMM d, yyyy')}`,
        cycle.totalEvaluations || 0,
        cycle.completedEvaluations || 0,
        `${cycle.progressPercentage?.toFixed(1) || 0}%`
      ]
    ].map(row => row.join(',')).join('\n');

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `evaluation-cycle-${cycle.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-5 w-5 text-blue-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (cycles.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No evaluation cycles found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new evaluation cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                Cycle Name
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Evaluation Period
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Progress
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                  {cycle.name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cycle.status)}`}>
                    {getStatusIcon(cycle.status)}
                    <span className="ml-1 capitalize">{cycle.status}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {format(new Date(cycle.evaluationStartDate), 'MMM d, yyyy')} - {format(new Date(cycle.evaluationEndDate), 'MMM d, yyyy')}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${cycle.progressPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs font-medium text-gray-900">
                      {cycle.progressPercentage?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {cycle.completedEvaluations || 0} of {cycle.totalEvaluations || 0} evaluations completed
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {cycle.status === 'draft' && (
                      <button
                        onClick={() => handleActivate(cycle.id)}
                        disabled={loading[cycle.id]}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading[cycle.id] ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        Activate
                      </button>
                    )}

                    {cycle.status === 'active' && (
                      <button
                        onClick={() => handlePause(cycle.id)}
                        disabled={loading[cycle.id]}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {loading[cycle.id] ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Pause className="h-3 w-3 mr-1" />
                        )}
                        Pause
                      </button>
                    )}

                    {cycle.status === 'paused' && (
                      <button
                        onClick={() => handleActivate(cycle.id)}
                        disabled={loading[cycle.id]}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading[cycle.id] ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        Resume
                      </button>
                    )}

                    {(cycle.status === 'active' || cycle.status === 'paused') && (
                      <button
                        onClick={() => handleStop(cycle.id)}
                        disabled={loading[cycle.id]}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      >
                        {loading[cycle.id] ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Square className="h-3 w-3 mr-1" />
                        )}
                        Stop
                      </button>
                    )}

                    <button
                      onClick={() => exportCycleData(cycle)}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </button>

                    <button
                      onClick={() => handleDelete(cycle.id)}
                      disabled={loading[cycle.id]}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading[cycle.id] ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvaluationCycleOverview;
