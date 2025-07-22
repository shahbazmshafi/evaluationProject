import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { AuthContext } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { User, Evaluation, KPI } from '../types';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getEvaluations: jest.fn(),
    getKPIs: jest.fn(),
    getUsers: jest.fn(),
  },
}));

// Mock the react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock data
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
    rawScore: 4.0,
    normalizedScore: 4.3,
    performanceLabel: 'Exceeds Expectations',
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
    rawScore: 3.5,
    normalizedScore: 3.8,
    performanceLabel: 'Meets Expectations',
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

const mockKPIs: KPI[] = [
  {
    id: '1',
    title: 'Code Quality',
    description: 'Maintain high code quality standards',
    weightage: 30,
    type: 'global',
    category: 'technical',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
    isTechnical: true,
  },
  {
    id: '2',
    title: 'Documentation',
    description: 'Create and maintain documentation',
    weightage: 20,
    type: 'role-based',
    category: 'technical',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
    isTechnical: true,
  },
];

// Mock auth context
const mockAuthContext = {
  user: null,
  token: 'test-token',
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getEvaluations as jest.Mock).mockResolvedValue(mockEvaluations);
    (apiService.getKPIs as jest.Mock).mockResolvedValue(mockKPIs);
    (apiService.getUsers as jest.Mock).mockResolvedValue(mockUsers);
  });

  test('Admin sees all filters and can filter by department, manager, and status', async () => {
    const adminUser = { ...mockUsers[0] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: adminUser }}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Welcome back, Admin User!')).toBeInTheDocument();
    });

    // Check that all filters are visible for admin
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Manager')).toBeInTheDocument();

    // Test department filter
    fireEvent.change(screen.getByLabelText('Department'), { target: { value: 'engineering' } });
    
    // Test manager filter
    fireEvent.change(screen.getByLabelText('Manager'), { target: { value: '2' } });
    
    // Test status filter
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'submitted' } });

    // Verify that getEvaluations was called with the correct filters
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith({
        department: 'engineering',
        managerId: '2',
        status: 'submitted',
      });
    });
  });

  test('Manager sees status and employee filters, and automatically filters by their ID', async () => {
    const managerUser = { ...mockUsers[1] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: managerUser }}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Welcome back, John Manager!')).toBeInTheDocument();
    });

    // Check that only status and employee filters are visible for manager
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Employee')).toBeInTheDocument();
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Manager')).not.toBeInTheDocument();

    // Verify that getEvaluations was called with the manager's ID
    expect(apiService.getEvaluations).toHaveBeenCalledWith(
      expect.objectContaining({
        managerId: '2',
      })
    );

    // Test employee filter
    fireEvent.change(screen.getByLabelText('Employee'), { target: { value: '3' } });
    
    // Test status filter
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'approved' } });

    // Verify that getEvaluations was called with the correct filters
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith({
        managerId: '2',
        employeeId: '3',
        status: 'approved',
      });
    });
  });

  test('Employee only sees status filter', async () => {
    const employeeUser = { ...mockUsers[2] };

    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: employeeUser }}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    // Wait for the dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Welcome back, Jane Employee!')).toBeInTheDocument();
    });

    // Check that only status filter is visible for employee
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Manager')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Employee')).not.toBeInTheDocument();

    // Test status filter
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'approved' } });

    // Verify that getEvaluations was called with the correct filters
    await waitFor(() => {
      expect(apiService.getEvaluations).toHaveBeenCalledWith({
        status: 'approved',
      });
    });
  });
});