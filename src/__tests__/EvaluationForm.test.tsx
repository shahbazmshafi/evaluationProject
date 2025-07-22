import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EvaluationForm from '../components/EvaluationForm';
import { apiService } from '../services/api';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getAllUsers: jest.fn(),
    getEmployeeKPIs: jest.fn(),
    getKPIs: jest.fn(),
    getEvaluations: jest.fn(),
    createEvaluation: jest.fn(),
    calculateRawScore: jest.fn(),
    calculateNormalizedScore: jest.fn(),
    getPerformanceLabel: jest.fn(),
    calculateIncrementPercentage: jest.fn(),
  }
}));

// Mock the AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: {
        id: '2',
        name: 'Manager',
        permissions: [
          { permission: { name: 'manage_evaluations' } }
        ]
      }
    }
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock the ScorePreview component
jest.mock('../components/ScorePreview', () => {
  return {
    __esModule: true,
    default: jest.fn(() => <div data-testid="score-preview">Score Preview Component</div>)
  };
});

describe('EvaluationForm Component', () => {
  const mockOnClose = jest.fn();
  
  // Sample KPIs for testing
  const mockKPIs = [
    {
      id: '101',
      title: 'Technical KPI 1',
      description: 'Description for Technical KPI 1',
      category: 'technical',
      weightage: 30,
      type: 'global',
      status: 'active',
      createdBy: '1',
      createdAt: '2023-01-01',
      isTechnical: true
    },
    {
      id: '102',
      title: 'Technical KPI 2',
      description: 'Description for Technical KPI 2',
      category: 'technical',
      weightage: 40,
      type: 'role-based',
      status: 'active',
      createdBy: '1',
      createdAt: '2023-01-01',
      isTechnical: true
    },
    {
      id: '103',
      title: 'Admin KPI 1',
      description: 'Description for Admin KPI 1',
      category: 'admin',
      weightage: 30,
      type: 'employee-specific',
      status: 'active',
      createdBy: '1',
      createdAt: '2023-01-01',
      isTechnical: false
    }
  ];
  
  // Sample users for testing
  const mockUsers = [
    {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: {
        id: '2',
        name: 'Manager',
        permissions: []
      },
      managerId: null,
      createdAt: '2023-01-01',
      isActive: true
    },
    {
      id: '2',
      name: 'Test Employee',
      email: 'employee@example.com',
      role: {
        id: '3',
        name: 'Employee',
        permissions: []
      },
      managerId: '1',
      createdAt: '2023-01-01',
      isActive: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock return values
    (apiService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
    (apiService.getEmployeeKPIs as jest.Mock).mockResolvedValue(mockKPIs);
    (apiService.getKPIs as jest.Mock).mockResolvedValue(mockKPIs);
    (apiService.getEvaluations as jest.Mock).mockResolvedValue([]);
    (apiService.createEvaluation as jest.Mock).mockResolvedValue({});
    
    (apiService.calculateRawScore as jest.Mock).mockImplementation((evals) => {
      if (evals.length === 0) return 0;
      return evals.reduce((sum, e) => sum + (e.rating * e.weightage), 0) / 100;
    });
    
    (apiService.calculateNormalizedScore as jest.Mock).mockImplementation((rawScore) => {
      return 3.00 + ((rawScore - 1.00) / 4.00) * 2.00;
    });
    
    (apiService.getPerformanceLabel as jest.Mock).mockImplementation((normalizedScore) => {
      if (normalizedScore >= 4.50) return "Outstanding";
      if (normalizedScore >= 4.00) return "Exceeds Expectations";
      if (normalizedScore >= 3.50) return "Meets Expectations";
      return "Below Expectations";
    });
    
    (apiService.calculateIncrementPercentage as jest.Mock).mockImplementation((normalizedScore) => {
      if (normalizedScore >= 4.50) return 22.5;
      if (normalizedScore >= 4.00) return 17.5;
      if (normalizedScore >= 3.50) return 12.5;
      if (normalizedScore >= 3.00) return 7.5;
      return 2.5;
    });
  });

  test('renders the form with progress tracking', async () => {
    render(<EvaluationForm onClose={mockOnClose} employeeId="2" />);
    
    // Wait for the form to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith("2");
    });
    
    // Check if progress tracking elements are rendered
    expect(screen.getByText(/Completion Progress/i)).toBeInTheDocument();
    
    // Initially all KPIs should have default rating of 0.0, so progress should be 100%
    expect(screen.getByText(/All KPIs have been rated/i)).toBeInTheDocument();
  });

  test('updates progress when ratings change', async () => {
    render(<EvaluationForm onClose={mockOnClose} employeeId="2" />);
    
    // Wait for the form to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith("2");
    });
    
    // Find all rating inputs
    const ratingInputs = screen.getAllByLabelText(/Rating value between 0.0 and 5.0/i);
    
    // Change one rating to an invalid value (-1.0)
    fireEvent.change(ratingInputs[0], { target: { value: '-1.0' } });
    
    // Progress should now show that one KPI needs rating
    expect(screen.getByText(/1 of 3 KPIs still need rating/i)).toBeInTheDocument();
  });

  test('integrates with ScorePreview component', async () => {
    render(<EvaluationForm onClose={mockOnClose} employeeId="2" />);
    
    // Wait for the form to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith("2");
    });
    
    // Check if ScorePreview component is rendered
    expect(screen.getByTestId('score-preview')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    render(<EvaluationForm onClose={mockOnClose} employeeId="2" />);
    
    // Wait for the form to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith("2");
    });
    
    // Find the submit button
    const submitButton = screen.getByText(/Submit Evaluation/i);
    
    // Click the submit button
    fireEvent.click(submitButton);
    
    // Check if the API was called to create the evaluation
    await waitFor(() => {
      expect(apiService.createEvaluation).toHaveBeenCalled();
    });
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('handles cancel button', async () => {
    render(<EvaluationForm onClose={mockOnClose} employeeId="2" />);
    
    // Wait for the form to load
    await waitFor(() => {
      expect(apiService.getEmployeeKPIs).toHaveBeenCalledWith("2");
    });
    
    // Find the cancel button
    const cancelButton = screen.getByText(/Cancel/i);
    
    // Click the cancel button
    fireEvent.click(cancelButton);
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });
});