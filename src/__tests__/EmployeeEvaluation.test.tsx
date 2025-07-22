import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import UsersPage from '../components/UsersPage';
import EvaluationForm from '../components/EvaluationForm';
import { apiService } from '../services/api';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getUsers: jest.fn(),
    getAllUsers: jest.fn(),
    getEmployeeKPIs: jest.fn(),
    createEvaluation: jest.fn(),
    getEvaluations: jest.fn(),
  }
}));

// Mock the auth context
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'manager-1',
      name: 'Test Manager',
      email: 'manager@example.com',
      role: {
        id: '2',
        name: 'Manager',
        permissions: [
          { permission: { name: 'manage_evaluations' } },
          { permission: { name: 'user_read' } },
          { permission: { name: 'user_write' } }
        ],
        isCustom: false
      },
      isActive: true,
      createdAt: '2023-01-01'
    },
    token: 'test-token',
    login: jest.fn(),
    logout: jest.fn(),
    isLoading: false
  })),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

describe('Employee Evaluation', () => {
  // Test data
  const mockUsers = [
    {
      id: 'employee-1',
      name: 'Test Employee',
      email: 'employee@example.com',
      role: {
        id: '3',
        name: 'Employee',
        permissions: [],
        isCustom: false
      },
      managerId: 'manager-1',
      isActive: true,
      createdAt: '2023-01-01'
    },
    {
      id: 'manager-1',
      name: 'Test Manager',
      email: 'manager@example.com',
      role: {
        id: '2',
        name: 'Manager',
        permissions: [],
        isCustom: false
      },
      isActive: true,
      createdAt: '2023-01-01'
    }
  ];

  const mockKPIs = [
    {
      id: 'kpi-1',
      title: 'Technical Skill 1',
      description: 'Description for Technical Skill 1',
      weightage: 30,
      type: 'employee-specific',
      category: 'technical',
      targetEmployeeId: 'employee-1',
      status: 'active',
      createdBy: 'manager-1',
      createdAt: '2023-01-01',
      isTechnical: true
    },
    {
      id: 'kpi-2',
      title: 'Admin Skill 1',
      description: 'Description for Admin Skill 1',
      weightage: 20,
      type: 'global',
      category: 'admin',
      status: 'active',
      createdBy: 'manager-1',
      createdAt: '2023-01-01',
      isTechnical: false
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    apiService.getUsers.mockResolvedValue(mockUsers);
    apiService.getAllUsers.mockResolvedValue(mockUsers);
    apiService.getEmployeeKPIs.mockResolvedValue(mockKPIs);
    apiService.createEvaluation.mockResolvedValue({
      id: 'eval-1',
      employeeId: 'employee-1',
      managerId: 'manager-1',
      period: '2023-Q1',
      status: 'draft'
    });
    apiService.getEvaluations.mockResolvedValue([]);
  });

  test('Manager can see Start Evaluation button for their employees', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    // Wait for users to load
    await waitFor(() => {
      expect(apiService.getUsers).toHaveBeenCalled();
    });

    // Check if the Start Evaluation button is visible for the employee
    const evaluationButton = screen.getByTitle('Start Evaluation');
    expect(evaluationButton).toBeInTheDocument();
  });

  test('Clicking Start Evaluation opens the evaluation form with employee data', async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    // Wait for users to load
    await waitFor(() => {
      expect(apiService.getUsers).toHaveBeenCalled();
    });

    // Click the Start Evaluation button
    const evaluationButton = screen.getByTitle('Start Evaluation');
    fireEvent.click(evaluationButton);

    // Wait for employee KPIs to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith('employee-1');
    });

    // Check if the evaluation form shows the employee name
    expect(screen.getByText('Evaluation: Test Employee')).toBeInTheDocument();
    
    // Check if the employee role is displayed
    expect(screen.getByText('Employee')).toBeInTheDocument();
    
    // Check if the KPIs are displayed
    expect(screen.getByText('Technical Skill 1')).toBeInTheDocument();
    expect(screen.getByText('Admin Skill 1')).toBeInTheDocument();
  });

  test('EvaluationForm loads employee-specific KPIs', async () => {
    render(
      <EvaluationForm 
        onClose={jest.fn()} 
        employeeId="employee-1" 
      />
    );

    // Wait for employee KPIs to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith('employee-1');
    });

    // Check if the KPIs are displayed
    expect(screen.getByText('Technical Skill 1')).toBeInTheDocument();
    expect(screen.getByText('Admin Skill 1')).toBeInTheDocument();
  });

  test('Submitting evaluation saves with correct employee ID', async () => {
    render(
      <EvaluationForm 
        onClose={jest.fn()} 
        employeeId="employee-1" 
      />
    );

    // Wait for employee KPIs to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith('employee-1');
    });

    // Click the Submit Evaluation button
    const submitButton = screen.getByText('Submit Evaluation');
    fireEvent.click(submitButton);

    // Wait for the evaluation to be created
    await waitFor(() => {
      expect(apiService.createEvaluation).toHaveBeenCalled();
      // Check that the employeeId is correct
      const callArg = apiService.createEvaluation.mock.calls[0][0];
      expect(callArg.employeeId).toBe('employee-1');
    });
  });
});