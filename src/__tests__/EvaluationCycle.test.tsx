import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '../contexts/AuthContext';
import EvaluationCycleForm from '../components/EvaluationCycleForm';
import EvaluationCycleOverview from '../components/EvaluationCycleOverview';
import { apiService } from '../services/api';
import NotificationService from '../services/NotificationService';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    createEvaluationCycle: jest.fn(),
    activateEvaluationCycle: jest.fn(),
    pauseEvaluationCycle: jest.fn(),
    stopEvaluationCycle: jest.fn(),
    deleteEvaluationCycle: jest.fn(),
    getEvaluations: jest.fn()
  }
}));

// Mock the NotificationService
jest.mock('../services/NotificationService', () => ({
  notifyCycleCreation: jest.fn(),
  notifyCycleActivation: jest.fn(),
  sendDeadlineReminders: jest.fn()
}));

describe('EvaluationCycleForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the form correctly', () => {
    render(<EvaluationCycleForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByText('Create Evaluation Cycle')).toBeInTheDocument();
    expect(screen.getByLabelText('Cycle Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Evaluation Period Start')).toBeInTheDocument();
    expect(screen.getByLabelText('Evaluation Period End')).toBeInTheDocument();
    expect(screen.getByLabelText('Execution Period Start')).toBeInTheDocument();
    expect(screen.getByLabelText('Execution Period End')).toBeInTheDocument();
    expect(screen.getByText('Create Cycle')).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<EvaluationCycleForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Submit the form without filling any fields
    fireEvent.click(screen.getByText('Create Cycle'));

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText('Cycle name is required')).toBeInTheDocument();
      expect(screen.getByText('Evaluation start date is required')).toBeInTheDocument();
      expect(screen.getByText('Evaluation end date is required')).toBeInTheDocument();
      expect(screen.getByText('Execution start date is required')).toBeInTheDocument();
      expect(screen.getByText('Execution end date is required')).toBeInTheDocument();
    });

    // Verify that the API was not called
    expect(apiService.createEvaluationCycle).not.toHaveBeenCalled();
  });

  test('submits the form with valid data', async () => {
    const mockCycle = {
      id: '1',
      name: 'Q1 2024 Review',
      evaluationStartDate: '2024-01-01',
      evaluationEndDate: '2024-03-31',
      executionStartDate: '2024-04-01',
      executionEndDate: '2024-04-15',
      status: 'draft',
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z'
    };

    (apiService.createEvaluationCycle as jest.Mock).mockResolvedValue(mockCycle);

    render(<EvaluationCycleForm onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Fill the form
    fireEvent.change(screen.getByLabelText('Cycle Name'), { target: { value: 'Q1 2024 Review' } });
    fireEvent.change(screen.getByLabelText('Evaluation Period Start'), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText('Evaluation Period End'), { target: { value: '2024-03-31' } });
    fireEvent.change(screen.getByLabelText('Execution Period Start'), { target: { value: '2024-04-01' } });
    fireEvent.change(screen.getByLabelText('Execution Period End'), { target: { value: '2024-04-15' } });

    // Submit the form
    fireEvent.click(screen.getByText('Create Cycle'));

    // Verify that the API was called with the correct data
    await waitFor(() => {
      expect(apiService.createEvaluationCycle).toHaveBeenCalledWith({
        name: 'Q1 2024 Review',
        evaluationStartDate: '2024-01-01',
        evaluationEndDate: '2024-03-31',
        executionStartDate: '2024-04-01',
        executionEndDate: '2024-04-15'
      });

      // Verify that notifications were sent
      expect(NotificationService.notifyCycleCreation).toHaveBeenCalledWith(mockCycle);

      // Verify that the success callback was called
      expect(mockOnSuccess).toHaveBeenCalledWith(mockCycle);

      // Verify that the close callback was called
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

describe('EvaluationCycleOverview', () => {
  const mockCycles = [
    {
      id: '1',
      name: 'Q1 2024 Review',
      evaluationStartDate: '2024-01-01',
      evaluationEndDate: '2024-03-31',
      executionStartDate: '2024-04-01',
      executionEndDate: '2024-04-15',
      status: 'draft',
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z',
      totalEvaluations: 10,
      completedEvaluations: 0,
      progressPercentage: 0
    },
    {
      id: '2',
      name: 'Q2 2024 Review',
      evaluationStartDate: '2024-04-01',
      evaluationEndDate: '2024-06-30',
      executionStartDate: '2024-07-01',
      executionEndDate: '2024-07-15',
      status: 'active',
      createdBy: '1',
      createdAt: '2024-04-01T00:00:00Z',
      totalEvaluations: 10,
      completedEvaluations: 5,
      progressPercentage: 50
    }
  ];

  const mockOnCycleActivated = jest.fn();
  const mockOnCyclePaused = jest.fn();
  const mockOnCycleStopped = jest.fn();
  const mockOnCycleDeleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the overview correctly', () => {
    render(
      <EvaluationCycleOverview 
        cycles={mockCycles} 
        onCycleActivated={mockOnCycleActivated}
        onCyclePaused={mockOnCyclePaused}
        onCycleStopped={mockOnCycleStopped}
        onCycleDeleted={mockOnCycleDeleted} 
      />
    );

    // Check that cycle names are displayed
    expect(screen.getByText('Q1 2024 Review')).toBeInTheDocument();
    expect(screen.getByText('Q2 2024 Review')).toBeInTheDocument();

    // Check that statuses are displayed
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    // Check that progress is displayed
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();

    // Check that action buttons are displayed correctly
    // Draft cycle should have Activate and Delete buttons
    const activateButtons = screen.getAllByText('Activate');
    expect(activateButtons.length).toBe(1);

    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(1);

    // Both cycles should have Export buttons
    const exportButtons = screen.getAllByText('Export');
    expect(exportButtons.length).toBe(2);
  });

  test('activates a cycle', async () => {
    const updatedCycle = {
      ...mockCycles[0],
      status: 'active'
    };

    (apiService.activateEvaluationCycle as jest.Mock).mockResolvedValue(updatedCycle);

    render(
      <EvaluationCycleOverview 
        cycles={mockCycles} 
        onCycleActivated={mockOnCycleActivated}
        onCyclePaused={mockOnCyclePaused}
        onCycleStopped={mockOnCycleStopped}
        onCycleDeleted={mockOnCycleDeleted} 
      />
    );

    // Click the Activate button
    fireEvent.click(screen.getAllByText('Activate')[0]);

    // Verify that the API was called with the correct ID
    await waitFor(() => {
      expect(apiService.activateEvaluationCycle).toHaveBeenCalledWith('1');

      // Verify that notifications were sent
      expect(NotificationService.notifyCycleActivation).toHaveBeenCalledWith(updatedCycle);

      // Verify that the callback was called
      expect(mockOnCycleActivated).toHaveBeenCalledWith(updatedCycle);
    });
  });

  test('deletes a cycle', async () => {
    // Mock window.confirm to return true
    window.confirm = jest.fn().mockImplementation(() => true);

    (apiService.deleteEvaluationCycle as jest.Mock).mockResolvedValue({});

    render(
      <EvaluationCycleOverview 
        cycles={mockCycles} 
        onCycleActivated={mockOnCycleActivated}
        onCyclePaused={mockOnCyclePaused}
        onCycleStopped={mockOnCycleStopped}
        onCycleDeleted={mockOnCycleDeleted} 
      />
    );

    // Click the Delete button
    fireEvent.click(screen.getAllByText('Delete')[0]);

    // Verify that the confirmation dialog was shown
    expect(window.confirm).toHaveBeenCalled();

    // Verify that the API was called with the correct ID
    await waitFor(() => {
      expect(apiService.deleteEvaluationCycle).toHaveBeenCalledWith('1');

      // Verify that the callback was called
      expect(mockOnCycleDeleted).toHaveBeenCalledWith('1');
    });
  });

  test('pauses a cycle', async () => {
    // Add an active cycle to the mock data
    const activeCycle = {
      ...mockCycles[1], // Use the active cycle from mock data
    };

    const updatedCycle = {
      ...activeCycle,
      status: 'paused'
    };

    // Mock window.confirm to return true
    window.confirm = jest.fn().mockImplementation(() => true);

    (apiService.pauseEvaluationCycle as jest.Mock).mockResolvedValue(updatedCycle);

    render(
      <EvaluationCycleOverview 
        cycles={[activeCycle]} 
        onCycleActivated={mockOnCycleActivated}
        onCyclePaused={mockOnCyclePaused}
        onCycleStopped={mockOnCycleStopped}
        onCycleDeleted={mockOnCycleDeleted} 
      />
    );

    // Click the Pause button
    fireEvent.click(screen.getByText('Pause'));

    // Verify that the confirmation dialog was shown
    expect(window.confirm).toHaveBeenCalled();

    // Verify that the API was called with the correct ID
    await waitFor(() => {
      expect(apiService.pauseEvaluationCycle).toHaveBeenCalledWith('2');

      // Verify that the callback was called
      expect(mockOnCyclePaused).toHaveBeenCalledWith(updatedCycle);
    });
  });

  test('stops a cycle', async () => {
    // Add an active cycle to the mock data
    const activeCycle = {
      ...mockCycles[1], // Use the active cycle from mock data
    };

    const updatedCycle = {
      ...activeCycle,
      status: 'cancelled'
    };

    // Mock window.confirm to return true
    window.confirm = jest.fn().mockImplementation(() => true);

    (apiService.stopEvaluationCycle as jest.Mock).mockResolvedValue(updatedCycle);

    render(
      <EvaluationCycleOverview 
        cycles={[activeCycle]} 
        onCycleActivated={mockOnCycleActivated}
        onCyclePaused={mockOnCyclePaused}
        onCycleStopped={mockOnCycleStopped}
        onCycleDeleted={mockOnCycleDeleted} 
      />
    );

    // Click the Stop button
    fireEvent.click(screen.getByText('Stop'));

    // Verify that the confirmation dialog was shown
    expect(window.confirm).toHaveBeenCalled();

    // Verify that the API was called with the correct ID
    await waitFor(() => {
      expect(apiService.stopEvaluationCycle).toHaveBeenCalledWith('2');

      // Verify that the callback was called
      expect(mockOnCycleStopped).toHaveBeenCalledWith(updatedCycle);
    });
  });
});
