import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EvaluationsPageWithErrorBoundary from '../components/EvaluationsPage';
import { AuthContext } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { User, Evaluation } from '../types';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getEvaluations: jest.fn(),
    getAllUsers: jest.fn(),
    getEmployeeEvaluations: jest.fn(),
  },
}));

// Mock the AuthContext
const mockAuthContext = {
  user: null,
  token: 'test-token',
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
};

// Test data
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'Admin User',
    role: { id: '1', name: 'Admin', permissions: [], isCustom: false },
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: '2',
    email: 'manager@company.com',
    name: 'John Manager',
    role: { id: '2', name: 'Manager', permissions: [], isCustom: false },
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: '3',
    email: 'employee@company.com',
    name: 'Jane Employee',
    role: { id: '3', name: 'Employee', permissions: [], isCustom: false },
    managerId: '2',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
];

const mockEvaluations: Evaluation[] = [
  {
    id: '1',
    employeeId: '3',
    managerId: '2',
    period: '2024-Q1',
    kpiEvaluations: [],
    technicalScore: 4.0,
    adminScore: 4.67,
    overallScore: 4.2,
    normalizedScore: 4.3,
    incrementPercentage: 17.5,
    status: 'submitted',
    comments: 'Great performance',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
    createdBy: '2',
    permissions: {
      can_view_increment_percentage: false,
      can_view_admin_comments: false,
      can_edit: true,
      can_approve: false
    }
  },
  {
    id: '2',
    employeeId: '3',
    managerId: '2',
    period: '2023-Q4',
    kpiEvaluations: [],
    technicalScore: 3.5,
    adminScore: 3.8,
    overallScore: 3.6,
    normalizedScore: 3.8,
    incrementPercentage: 12.5,
    status: 'approved',
    comments: 'Good work',
    createdAt: '2023-12-15T00:00:00Z',
    updatedAt: '2023-12-20T00:00:00Z',
    createdBy: '2',
    permissions: {
      can_view_increment_percentage: false,
      can_view_admin_comments: false,
      can_edit: true,
      can_approve: false
    }
  },
];

describe('EvaluationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getEvaluations as jest.Mock).mockResolvedValue(mockEvaluations);
    (apiService.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
    (apiService.getEmployeeEvaluations as jest.Mock).mockResolvedValue({
      items: mockEvaluations,
      total: mockEvaluations.length,
      page: 1,
      page_size: 10,
      total_pages: 1
    });
  });

  test('Admin can see all evaluations and has access to all filters', async () => {
    const adminUser = { ...mockUsers[0] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: adminUser }}>
        <EvaluationsPageWithErrorBoundary />
      </AuthContext.Provider>
    );

    // Verify API was called without filters initially
    expect(apiService.getEvaluations).toHaveBeenCalledWith(expect.objectContaining({}));

    // Verify admin has access to all filter options
    await waitFor(() => {
      // Status filter
      expect(screen.getByText('All Status')).toBeInTheDocument();

      // Manager filter (admin only)
      expect(screen.getByText('All Managers')).toBeInTheDocument();

      // Department filter (admin only)
      expect(screen.getByText('All Departments')).toBeInTheDocument();

      // Content is displayed
      expect(screen.getByText('2024-Q1')).toBeInTheDocument();
      expect(screen.getByText('2023-Q4')).toBeInTheDocument();
    });

    // Test department filter
    const departmentSelect = screen.getAllByRole('combobox')[2]; // Third dropdown is department
    fireEvent.change(departmentSelect, { target: { value: 'Engineering' } });

    // Verify API was called with department filter
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith(
        expect.objectContaining({ department: 'Engineering' })
      );
    });

    // Test manager filter
    const managerSelect = screen.getAllByRole('combobox')[1]; // Second dropdown is manager
    fireEvent.change(managerSelect, { target: { value: '2' } });

    // Verify API was called with manager filter
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith(
        expect.objectContaining({ managerId: '2' })
      );
    });
  });

  test('Manager can only see evaluations of their direct reports and has limited filters', async () => {
    const managerUser = { ...mockUsers[1] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: managerUser }}>
        <EvaluationsPageWithErrorBoundary />
      </AuthContext.Provider>
    );

    // Verify API was called without filters initially
    expect(apiService.getEvaluations).toHaveBeenCalledWith(expect.objectContaining({}));

    await waitFor(() => {
      // Status filter should be available
      expect(screen.getByText('All Status')).toBeInTheDocument();

      // Employee filter should be available (manager only)
      expect(screen.getByText('All Team Members')).toBeInTheDocument();

      // Manager filter should NOT be available (admin only)
      expect(screen.queryByText('All Managers')).not.toBeInTheDocument();

      // Department filter should NOT be available (admin only)
      expect(screen.queryByText('All Departments')).not.toBeInTheDocument();

      // Content is displayed
      expect(screen.getByText('2024-Q1')).toBeInTheDocument();
      expect(screen.getByText('2023-Q4')).toBeInTheDocument();
    });

    // Test employee filter
    const employeeSelect = screen.getAllByRole('combobox')[1]; // Second dropdown is employee
    fireEvent.change(employeeSelect, { target: { value: '3' } });

    // Verify getEmployeeEvaluations API was called with employee ID
    await waitFor(() => {
      expect(apiService.getEmployeeEvaluations).toHaveBeenCalledWith(
        '3', 1, 10, expect.objectContaining({})
      );
    });
  });

  test('Employee can only see their own evaluations and has minimal filters', async () => {
    const employeeUser = { ...mockUsers[2] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: employeeUser }}>
        <EvaluationsPageWithErrorBoundary />
      </AuthContext.Provider>
    );

    // Verify API was called without filters initially
    expect(apiService.getEvaluations).toHaveBeenCalledWith(expect.objectContaining({}));

    await waitFor(() => {
      // Status filter should be available
      expect(screen.getByText('All Status')).toBeInTheDocument();

      // Employee filter should NOT be available (manager only)
      expect(screen.queryByText('All Team Members')).not.toBeInTheDocument();

      // Manager filter should NOT be available (admin only)
      expect(screen.queryByText('All Managers')).not.toBeInTheDocument();

      // Department filter should NOT be available (admin only)
      expect(screen.queryByText('All Departments')).not.toBeInTheDocument();

      // Content is displayed
      expect(screen.getByText('2024-Q1')).toBeInTheDocument();
      expect(screen.getByText('2023-Q4')).toBeInTheDocument();
    });
  });

  test('View toggle switches between Card and Grid views', async () => {
    const adminUser = { ...mockUsers[0] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: adminUser }}>
        <EvaluationsPageWithErrorBoundary />
      </AuthContext.Provider>
    );

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('Card')).toBeInTheDocument();
      expect(screen.getByText('Grid')).toBeInTheDocument();
    });

    // Initially in Card view
    expect(screen.getByText('Technical KPIs (70%)')).toBeInTheDocument();

    // Switch to Grid view
    fireEvent.click(screen.getByText('Grid'));

    // Should now show table headers
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Technical Score')).toBeInTheDocument();
    expect(screen.getByText('Admin Score')).toBeInTheDocument();
    expect(screen.getByText('Total Score')).toBeInTheDocument();

    // Switch back to Card view
    fireEvent.click(screen.getByText('Card'));

    // Should show Card view elements again
    expect(screen.getByText('Technical KPIs (70%)')).toBeInTheDocument();
  });

  test('Status filter works correctly with backend filtering', async () => {
    const adminUser = { ...mockUsers[0] };

    // Mock filtered responses for different status values
    const submittedEvaluations = mockEvaluations.filter(e => e.status === 'submitted');
    const approvedEvaluations = mockEvaluations.filter(e => e.status === 'approved');

    // Setup the mock to return different data based on the status filter
    (apiService.getEvaluations as jest.Mock).mockImplementation((filters) => {
      if (filters?.status === 'submitted') {
        return Promise.resolve(submittedEvaluations);
      } else if (filters?.status === 'approved') {
        return Promise.resolve(approvedEvaluations);
      } else {
        return Promise.resolve(mockEvaluations);
      }
    });

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: adminUser }}>
        <EvaluationsPageWithErrorBoundary />
      </AuthContext.Provider>
    );

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });

    // Verify initial API call with no status filter
    expect(apiService.getEvaluations).toHaveBeenCalledWith(expect.objectContaining({}));

    // Filter by 'submitted' status
    const statusSelect = screen.getAllByRole('combobox')[0]; // First dropdown is status
    fireEvent.change(statusSelect, { target: { value: 'submitted' } });

    // Verify API was called with status filter
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted' })
      );
    });

    // Filter by 'approved' status
    fireEvent.change(statusSelect, { target: { value: 'approved' } });

    // Verify API was called with status filter
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
    });
  });
});
