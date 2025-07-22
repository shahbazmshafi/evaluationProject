export interface User {
  id: string | number;
  email: string;
  name: string;
  role: Role;
  managerId?: string;
  createdAt: string;
  isActive: boolean;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  permission: Permission;
}

export interface Role {
  id: string | number;
  name: string;
  permissions: RolePermission[];
  isCustom: boolean;
}

export interface Permission {
  id: string | number;
  name: string;
  description?: string;
}

export interface KPI {
  id: string;
  title: string;
  description: string;
  weightage: number;
  type: 'global' | 'role-based' | 'employee-specific';
  category: 'technical' | 'admin';
  targetRoleId?: string;
  targetEmployeeId?: string;
  status: 'draft' | 'active' | 'archived';
  createdBy: string;
  createdAt: string;
  managerId?: string;
  isTechnical: boolean;

  // Additional fields for display purposes
  creatorRole?: string;
  targetRoleName?: string;
  targetEmployeeName?: string;
}

export interface KPIEvaluation {
  id?: string;
  kpiId: string;
  title: string;
  description: string;
  category: 'technical' | 'admin';
  weightage: number;
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationPermissions {
  can_view_increment_percentage: boolean;
  can_view_admin_comments: boolean;
  can_edit: boolean;
  can_approve: boolean;
}

export interface Evaluation {
  id: string;
  employeeId: string;
  managerId: string;
  cycleId?: string;
  period: string;
  kpiEvaluations: KPIEvaluation[];
  rawScore: number;
  normalizedScore: number;
  performanceLabel: string;
  incrementPercentage: number;
  status: 'pending' | 'draft' | 'submitted' | 'approved' | 'rejected';
  comments?: string;
  managerComments?: string;
  adminComments?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdBy: string;
  draftedBy?: string;
  permissions?: EvaluationPermissions;
}

// Keep for backward compatibility
export interface KPIRating {
  kpiId: string;
  rating: number;
  comment?: string;
  weightage: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'kpi_submission' | 'evaluation_window' | 'hr_approval' | 'results_available' | 'evaluation_submitted';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCreate {
  userId: string;
  type: 'kpi_submission' | 'evaluation_window' | 'hr_approval' | 'results_available' | 'evaluation_submitted';
  title: string;
  message: string;
  isRead: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedEvaluationResponse extends PaginatedResponse<Evaluation> {}

export interface EvaluationCreatePayload {
  employee_id: number;
  manager_id: number;
  period: string;
  cycle_id?: number;
  kpi_evaluations: {
    kpi_id: number;
    title: string;
    description: string;
    category: 'technical' | 'admin';
    weightage: number;
    rating: number;
    comment?: string;
  }[];
  status: 'draft' | 'submitted';
  comments?: string;
  manager_comments?: string;
  admin_comments?: string;
  drafted_by?: number;
}

export interface EvaluationCycle {
  id: string;
  name: string;
  evaluationStartDate: string;
  evaluationEndDate: string;
  executionStartDate: string;
  executionEndDate: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  totalEvaluations?: number;
  completedEvaluations?: number;
  progressPercentage?: number;
  remainingDays?: number;
}

export interface PaginatedEvaluationCycleResponse extends PaginatedResponse<EvaluationCycle> {}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}
