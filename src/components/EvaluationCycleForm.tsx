import React, { useState } from 'react';
import { EvaluationCycle, User } from '../types';
import { apiService } from '../services/api';
import NotificationService from '../services/NotificationService';
import { Calendar, X, Wand2 } from 'lucide-react';

interface EvaluationCycleFormProps {
  onClose: () => void;
  onSuccess?: (cycle: EvaluationCycle) => void;
  currentUser?: User | null;
}

const EvaluationCycleForm: React.FC<EvaluationCycleFormProps> = ({ onClose, onSuccess, currentUser }) => {
  const [name, setName] = useState('');
  const [evaluationStartDate, setEvaluationStartDate] = useState('');
  const [evaluationEndDate, setEvaluationEndDate] = useState('');
  const [executionStartDate, setExecutionStartDate] = useState('');
  const [executionEndDate, setExecutionEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to fill the form with sample data
  const fillWithSampleData = () => {
    // Get current date
    const today = new Date();

    // Calculate dates for a sensible evaluation cycle
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;

    // Set evaluation period for next half year
    const evalStartDate = new Date(currentYear, today.getMonth() + 1, 1);
    const evalEndDate = new Date(currentYear, today.getMonth() + 6, 0);

    // Set execution period for after evaluation period
    const execStartDate = new Date(evalEndDate);
    execStartDate.setDate(execStartDate.getDate() + 1);
    const execEndDate = new Date(execStartDate);
    execEndDate.setDate(execStartDate.getDate() + 14); // Two weeks after execution start

    // Format dates as YYYY-MM-DD for input fields
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Set form values
    setName(`${evalStartDate.toLocaleString('default', { month: 'long' })} - ${evalEndDate.toLocaleString('default', { month: 'long' })} ${currentYear} Evaluation`);
    setEvaluationStartDate(formatDate(evalStartDate));
    setEvaluationEndDate(formatDate(evalEndDate));
    setExecutionStartDate(formatDate(execStartDate));
    setExecutionEndDate(formatDate(execEndDate));

    // Clear any errors
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Cycle name is required';
    }

    if (!evaluationStartDate) {
      newErrors.evaluationStartDate = 'Evaluation start date is required';
    }

    if (!evaluationEndDate) {
      newErrors.evaluationEndDate = 'Evaluation end date is required';
    }

    if (!executionStartDate) {
      newErrors.executionStartDate = 'Execution start date is required';
    }

    if (!executionEndDate) {
      newErrors.executionEndDate = 'Execution end date is required';
    }

    if (evaluationStartDate && evaluationEndDate && new Date(evaluationStartDate) >= new Date(evaluationEndDate)) {
      newErrors.evaluationEndDate = 'Evaluation end date must be after start date';
    }

    if (executionStartDate && executionEndDate && new Date(executionStartDate) >= new Date(executionEndDate)) {
      newErrors.executionEndDate = 'Execution end date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cycle = await apiService.createEvaluationCycle({
        name,
        evaluationStartDate,
        evaluationEndDate,
        executionStartDate,
        executionEndDate
      });

      // Send notifications to managers about the new cycle
      try {
        await NotificationService.notifyCycleCreation(cycle);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Continue with the flow even if notifications fail
      }

      if (onSuccess) {
        onSuccess(cycle);
      }

      onClose();
    } catch (error) {
      console.error('Error creating evaluation cycle:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create evaluation cycle' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Create Evaluation Cycle</h2>
          <div className="flex items-center space-x-2">
            {currentUser?.role.name?.toLowerCase() === 'admin' && (
              <button
                type="button"
                onClick={fillWithSampleData}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="Fill with sample data"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Fill Sample Data
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {errors.submit && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Cycle Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Q1 2023 Performance Review"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="evaluationStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                Evaluation Period Start
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="evaluationStartDate"
                  value={evaluationStartDate}
                  onChange={(e) => setEvaluationStartDate(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md ${errors.evaluationStartDate ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.evaluationStartDate && <p className="mt-1 text-sm text-red-500">{errors.evaluationStartDate}</p>}
            </div>

            <div>
              <label htmlFor="evaluationEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                Evaluation Period End
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="evaluationEndDate"
                  value={evaluationEndDate}
                  onChange={(e) => setEvaluationEndDate(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md ${errors.evaluationEndDate ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.evaluationEndDate && <p className="mt-1 text-sm text-red-500">{errors.evaluationEndDate}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="executionStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                Execution Period Start
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="executionStartDate"
                  value={executionStartDate}
                  onChange={(e) => setExecutionStartDate(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md ${errors.executionStartDate ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.executionStartDate && <p className="mt-1 text-sm text-red-500">{errors.executionStartDate}</p>}
            </div>

            <div>
              <label htmlFor="executionEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                Execution Period End
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="executionEndDate"
                  value={executionEndDate}
                  onChange={(e) => setExecutionEndDate(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md ${errors.executionEndDate ? 'border-red-500' : 'border-gray-300'}`}
                />
              </div>
              {errors.executionEndDate && <p className="mt-1 text-sm text-red-500">{errors.executionEndDate}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationCycleForm;
