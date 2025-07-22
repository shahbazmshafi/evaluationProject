import { User, Role, Permission, KPI, Evaluation, Notification } from '../types';

export const mockPermissions: Permission[] = [
  { id: '1', name: 'USER_READ', description: 'View users' },
  { id: '2', name: 'USER_WRITE', description: 'Create/Edit users' },
  { id: '3', name: 'USER_DELETE', description: 'Delete users' },
  { id: '4', name: 'KPI_READ', description: 'View KPIs' },
  { id: '5', name: 'KPI_WRITE', description: 'Create/Edit KPIs' },
  { id: '6', name: 'KPI_DELETE', description: 'Delete KPIs' },
  { id: '7', name: 'EVALUATION_READ', description: 'View evaluations' },
  { id: '8', name: 'EVALUATION_WRITE', description: 'Create/Edit evaluations' },
  { id: '9', name: 'EVALUATION_APPROVE', description: 'Approve evaluations' },
];

export const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    permissions: mockPermissions,
    isCustom: false,
  },
  {
    id: '2',
    name: 'Manager',
    permissions: mockPermissions.filter(p => !p.name.includes('DELETE')),
    isCustom: false,
  },
  {
    id: '3',
    name: 'Employee',
    permissions: mockPermissions.filter(p => p.name.includes('READ')),
    isCustom: false,
  },
];

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    name: 'Admin User',
    role: mockRoles[0],
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: '2',
    email: 'manager@company.com',
    name: 'John Manager',
    role: mockRoles[1],
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: '3',
    email: 'employee@company.com',
    name: 'Jane Employee',
    role: mockRoles[2],
    managerId: '2',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: '4',
    email: 'sgul@trafix.com',
    name: 'Super Admin',
    role: mockRoles[0], // Admin role
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
  },
];

export const mockKPIs: KPI[] = [
  // Technical KPIs (70%)
  {
    id: '1',
    title: 'Code Quality',
    description: 'Maintain high code quality standards',
    weightage: 15,
    type: 'global',
    category: 'technical',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Project Delivery',
    description: 'On-time project delivery',
    weightage: 20,
    type: 'role-based',
    category: 'technical',
    targetRoleId: '3',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    title: 'Bug-free Code',
    description: 'Deliver code with zero major bugs',
    weightage: 10,
    type: 'global',
    category: 'technical',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    title: 'Test Coverage',
    description: 'Maintain test coverage above 90%',
    weightage: 15,
    type: 'global',
    category: 'technical',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    title: 'Innovation',
    description: 'Innovative solutions and ideas',
    weightage: 10,
    type: 'global',
    category: 'technical',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },

  // Admin KPIs (30%)
  {
    id: '6',
    title: 'Attendance',
    description: 'Regular attendance and punctuality',
    weightage: 10,
    type: 'global',
    category: 'admin',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '7',
    title: 'Team Collaboration',
    description: 'Effective collaboration with team members',
    weightage: 10,
    type: 'global',
    category: 'admin',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '8',
    title: 'Company Values',
    description: 'Adherence to company values and culture',
    weightage: 10,
    type: 'global',
    category: 'admin',
    status: 'active',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const mockEvaluations: Evaluation[] = [
  {
    id: '1',
    employeeId: '3',
    managerId: '2',
    period: '2024-Q1',
    kpiEvaluations: [
      // Technical KPIs (70%)
      { kpiId: '1', title: 'Code Quality', description: 'Maintain high code quality standards', category: 'technical', rating: 4, comment: 'Good code quality', weightage: 15 },
      { kpiId: '2', title: 'Project Delivery', description: 'On-time project delivery', category: 'technical', rating: 5, comment: 'Excellent project delivery', weightage: 20 },
      { kpiId: '3', title: 'Bug-free Code', description: 'Deliver code with zero major bugs', category: 'technical', rating: 4, comment: 'No major bugs found', weightage: 10 },
      { kpiId: '4', title: 'Test Coverage', description: 'Maintain test coverage above 90%', category: 'technical', rating: 3, comment: 'Test coverage at 92%', weightage: 15 },
      { kpiId: '5', title: 'Innovation', description: 'Innovative solutions and ideas', category: 'technical', rating: 4, comment: 'Creative solutions', weightage: 10 },

      // Admin KPIs (30%)
      { kpiId: '6', title: 'Attendance', description: 'Regular attendance and punctuality', category: 'admin', rating: 5, comment: 'Perfect attendance', weightage: 10 },
      { kpiId: '7', title: 'Team Collaboration', description: 'Effective collaboration with team members', category: 'admin', rating: 4, comment: 'Good team player', weightage: 10 },
      { kpiId: '8', title: 'Company Values', description: 'Adherence to company values and culture', category: 'admin', rating: 5, comment: 'Exemplifies company values', weightage: 10 },
    ],
    technicalScore: 4.0, // (4*15 + 5*20 + 4*10 + 3*15 + 4*10) / 70 = 4.0
    adminScore: 4.67, // (5*10 + 4*10 + 5*10) / 30 = 4.67
    overallScore: 4.2, // (4.0*0.7 + 4.67*0.3) = 4.2
    normalizedScore: 4.3, // Normalized based on the calculation formula
    incrementPercentage: 17.5,
    status: 'submitted',
    comments: 'Great performance overall',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
    permissions: {
      can_view_increment_percentage: false,
      can_view_admin_comments: false,
      can_edit: true,
      can_approve: false
    },
    createdBy: '2'
  },
  {
    id: '2',
    employeeId: '3',
    managerId: '2',
    period: '2023-Q4',
    kpiEvaluations: [
      // Technical KPIs (70%)
      { kpiId: '1', title: 'Code Quality', description: 'Maintain high code quality standards', category: 'technical', rating: 3, comment: 'Acceptable code quality', weightage: 15 },
      { kpiId: '2', title: 'Project Delivery', description: 'On-time project delivery', category: 'technical', rating: 4, comment: 'Good project delivery', weightage: 20 },
      { kpiId: '3', title: 'Bug-free Code', description: 'Deliver code with zero major bugs', category: 'technical', rating: 3, comment: 'Few minor bugs found', weightage: 10 },
      { kpiId: '4', title: 'Test Coverage', description: 'Maintain test coverage above 90%', category: 'technical', rating: 3, comment: 'Test coverage at 88%', weightage: 15 },
      { kpiId: '5', title: 'Innovation', description: 'Innovative solutions and ideas', category: 'technical', rating: 3, comment: 'Standard solutions', weightage: 10 },

      // Admin KPIs (30%)
      { kpiId: '6', title: 'Attendance', description: 'Regular attendance and punctuality', category: 'admin', rating: 4, comment: 'Good attendance', weightage: 10 },
      { kpiId: '7', title: 'Team Collaboration', description: 'Effective collaboration with team members', category: 'admin', rating: 3, comment: 'Satisfactory team collaboration', weightage: 10 },
      { kpiId: '8', title: 'Company Values', description: 'Adherence to company values and culture', category: 'admin', rating: 4, comment: 'Good adherence to company values', weightage: 10 },
    ],
    technicalScore: 3.29, // (3*15 + 4*20 + 3*10 + 3*15 + 3*10) / 70 = 3.29
    adminScore: 3.67, // (4*10 + 3*10 + 4*10) / 30 = 3.67
    overallScore: 3.4, // (3.29*0.7 + 3.67*0.3) = 3.4
    normalizedScore: 3.7, // Normalized based on the calculation formula
    incrementPercentage: 12.5,
    status: 'approved',
    comments: 'Solid performance with room for improvement',
    createdAt: '2023-12-15T00:00:00Z',
    updatedAt: '2023-12-20T00:00:00Z',
    permissions: {
      can_view_increment_percentage: false,
      can_view_admin_comments: false,
      can_edit: true,
      can_approve: false
    },
    createdBy: '2'
  },
  {
    id: '3',
    employeeId: '3',
    managerId: '2',
    period: '2024-Q2',
    kpiEvaluations: [],
    technicalScore: 0,
    adminScore: 0,
    overallScore: 0,
    normalizedScore: 0,
    incrementPercentage: 0,
    status: 'pending',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-04-01T00:00:00Z',
    permissions: {
      can_view_increment_percentage: false,
      can_view_admin_comments: false,
      can_edit: true,
      can_approve: false
    },
    createdBy: '2'
  },
  {
    id: '4',
    employeeId: '3',
    managerId: '2',
    period: '2024-Q3',
    kpiEvaluations: [
      // Technical KPIs (70%) - partially filled
      { kpiId: '1', title: 'Code Quality', description: 'Maintain high code quality standards', category: 'technical', rating: 4, comment: 'Good code quality', weightage: 15 },
      { kpiId: '2', title: 'Project Delivery', description: 'On-time project delivery', category: 'technical', rating: 4, comment: 'Good project delivery', weightage: 20 },
      // Admin KPIs - not yet filled
    ],
    technicalScore: 0,
    adminScore: 0,
    overallScore: 0,
    normalizedScore: 0,
    incrementPercentage: 0,
    status: 'draft',
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-07-05T00:00:00Z',
    permissions: {
      can_view_increment_percentage: false,
      can_view_admin_comments: false,
      can_edit: true,
      can_approve: false
    },
    createdBy: '2'
  },
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: '3',
    type: 'evaluation_window',
    title: 'Evaluation Window Open',
    message: 'Your Q1 evaluation window is now open',
    isRead: false,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '2',
    userId: '2',
    type: 'kpi_submission',
    title: 'KPI Submitted',
    message: 'Jane Employee has submitted their KPI evaluation',
    isRead: true,
    createdAt: '2024-03-02T00:00:00Z',
  },
];
