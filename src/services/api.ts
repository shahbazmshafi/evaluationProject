import { User, KPI, Evaluation, Notification, NotificationCreate } from '../types';
import { mockUsers, mockKPIs, mockEvaluations, mockNotifications, mockRoles, mockPermissions } from '../data/mockData';
import { isRunningInDocker } from '../utils/environment';

// Mock API service with simulated delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create a mock notification
const createMockNotification = (notificationData: NotificationCreate): Notification => {
  const newId = (mockNotifications.length + 1).toString();
  const newNotification: Notification = {
    id: newId,
    userId: notificationData.userId,
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    isRead: notificationData.isRead,
    createdAt: new Date().toISOString()
  };

  // Add to mock notifications array
  mockNotifications.push(newNotification);

  return newNotification;
};

// Base URL for API calls
const API_BASE_URL = isRunningInDocker() ? '/api' : 'http://localhost:8000';

// Token storage key (must match the one in AuthContext)
const TOKEN_STORAGE_KEY = 'auth_token';

// Helper function to get the current auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

// Helper function to create headers with auth token
const createAuthHeaders = (contentType = 'application/json'): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': contentType
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Helper functions for storage management
// const getAllUsers = async (): Promise<User[]> => {
//   // If running in Docker, use backend API
//   if (isRunningInDocker()) {
//     try {
//       const response = await fetch(`${API_BASE_URL}/users`, {
//         headers: createAuthHeaders()
//       });
//       const data = await response.json();
//
//       if (data.users && Array.isArray(data.users)) {
//         return data.users;
//       } else {
//         // If no data or invalid data, use mock users
//         await saveAllUsers(mockUsers);
//         return mockUsers;
//       }
//     } catch (error) {
//       console.warn('Error fetching user data from backend, using mock users:', error);
//       await saveAllUsers(mockUsers);
//       return mockUsers;
//     }
//   }
//
//   // If not in Docker, use localStorage
//   try {
//     const stored = localStorage.getItem('allUsers');
//     if (stored) {
//       const existingUsers = JSON.parse(stored);
//
//       // Ensure existingUsers is an array and filter out invalid entries
//       if (Array.isArray(existingUsers)) {
//         const validExistingUsers = existingUsers.filter((user: any) =>
//           user && typeof user === 'object' && user.email && user.id
//         );
//
//         // Use Map to merge users, ensuring mock users are always present
//         const userMap = new Map<string, User>();
//
//         // First add existing valid users
//         validExistingUsers.forEach((user: User) => {
//           userMap.set(user.email, user);
//         });
//
//         // Then add/update with mock users (this ensures mock users are always present)
//         mockUsers.forEach((mockUser: User) => {
//           userMap.set(mockUser.email, mockUser);
//         });
//
//         const mergedUsers = Array.from(userMap.values());
//
//         // Save the cleaned and merged data back to localStorage
//         localStorage.setItem('allUsers', JSON.stringify(mergedUsers));
//         return mergedUsers;
//       } else {
//         // If stored data is not an array, reset with mock users
//         localStorage.setItem('allUsers', JSON.stringify(mockUsers));
//         return mockUsers;
//       }
//     } else {
//       // First time - initialize with mock users
//       localStorage.setItem('allUsers', JSON.stringify(mockUsers));
//       return mockUsers;
//     }
//   } catch (error) {
//     // If JSON parsing fails or any other error occurs, reset with mock users
//     console.warn('Error parsing user data from localStorage, resetting with mock users:', error);
//     localStorage.setItem('allUsers', JSON.stringify(mockUsers));
//     return mockUsers;
//   }
// };

const getAllUsers = async (): Promise<User[]> => {
  if (isRunningInDocker()) {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: createAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const users = await response.json();

      // Convert snake_case to camelCase and ensure proper boolean conversion
      return users.map((user: any) => ({
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: {
          id: user.role.id.toString(),
          name: user.role.name,
          permissions: user.role.permissions || [],
          isCustom: Boolean(user.role.is_custom)
        },
        managerId: user.manager_id ? user.manager_id.toString() : undefined,
        isActive: Boolean(user.is_active), // Ensure proper boolean conversion
        createdAt: user.created_at
      }));

    } catch (error) {
      console.error('Error fetching user data from backend:', error);
      throw error;
    }
  }

  // If not in Docker, use localStorage implementation
  try {
    const stored = localStorage.getItem('allUsers');
    if (stored) {
      const existingUsers = JSON.parse(stored);
      if (Array.isArray(existingUsers)) {
        return existingUsers;
      }
    }
    return mockUsers;
  } catch (error) {
    console.warn('Error parsing user data from localStorage:', error);
    return mockUsers;
  }
};

const saveAllUsers = async (users: User[]): Promise<void> => {
  if (!isRunningInDocker()) {
    // Only save to localStorage when not in Docker
    localStorage.setItem('allUsers', JSON.stringify(users));
  }
  // Do nothing when in Docker as we don't need to sync
};


const getUserPasswords = async (): Promise<Record<string, string>> => {
  const defaultPasswords = {
    'admin@company.com': 'password',
    'manager@company.com': 'password',
    'employee@company.com': 'password'
  };

  // If running in Docker, use backend API
  if (isRunningInDocker()) {
    try {
      const response = await fetch(`${API_BASE_URL}/sync/passwords`, {
        headers: createAuthHeaders()
      });
      const data = await response.json();

      if (data.passwords && typeof data.passwords === 'object') {
        // Ensure default passwords are always present
        const mergedPasswords = { ...defaultPasswords, ...data.passwords };
        await saveUserPasswords(mergedPasswords);
        return mergedPasswords;
      } else {
        // If no data or invalid data, use default passwords
        await saveUserPasswords(defaultPasswords);
        return defaultPasswords;
      }
    } catch (error) {
      console.warn('Error fetching password data from backend, using defaults:', error);
      await saveUserPasswords(defaultPasswords);
      return defaultPasswords;
    }
  }

  // If not in Docker, use localStorage
  try {
    const stored = localStorage.getItem('userPasswords');

    if (stored) {
      const existingPasswords = JSON.parse(stored);
      if (typeof existingPasswords === 'object' && existingPasswords !== null) {
        // Ensure default passwords are always present
        const mergedPasswords = { ...defaultPasswords, ...existingPasswords };
        localStorage.setItem('userPasswords', JSON.stringify(mergedPasswords));
        return mergedPasswords;
      } else {
        // If stored data is not an object, reset with default passwords
        localStorage.setItem('userPasswords', JSON.stringify(defaultPasswords));
        return defaultPasswords;
      }
    } else {
      // First time - initialize with default passwords
      localStorage.setItem('userPasswords', JSON.stringify(defaultPasswords));
      return defaultPasswords;
    }
  } catch (error) {
    // If JSON parsing fails, reset with default passwords
    console.warn('Error parsing password data from localStorage, resetting with defaults:', error);
    localStorage.setItem('userPasswords', JSON.stringify(defaultPasswords));
    return defaultPasswords;
  }
};

const saveUserPasswords = async (passwords: Record<string, string>): Promise<void> => {
  if (isRunningInDocker()) {
    try {
      await fetch(`${API_BASE_URL}/sync/passwords`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ passwords }),
      });
    } catch (error) {
      console.warn('Error saving password data to backend:', error);
    }
  } else {
    localStorage.setItem('userPasswords', JSON.stringify(passwords));
  }
};

const getAllKPIs = async (): Promise<KPI[]> => {
  // If running in Docker, use backend API
  if (isRunningInDocker()) {
    try {
      const response = await fetch(`${API_BASE_URL}/kpis`, {
        headers: createAuthHeaders()
      });
      const data = await response.json();

      if (data.kpis && Array.isArray(data.kpis)) {
        return data.kpis;
      } else {
        // If no data or invalid data, use mock KPIs
        await saveAllKPIs(mockKPIs);
        return mockKPIs;
      }
    } catch (error) {
      console.warn('Error fetching KPI data from backend, using mock KPIs:', error);
      await saveAllKPIs(mockKPIs);
      return mockKPIs;
    }
  }

  // If not in Docker, use localStorage
  const stored = localStorage.getItem('allKPIs');
  if (stored) {
    try {
      const kpis = JSON.parse(stored);
      return Array.isArray(kpis) ? kpis : mockKPIs;
    } catch (error) {
      console.warn('Error parsing KPI data from localStorage, using mock KPIs:', error);
      localStorage.setItem('allKPIs', JSON.stringify(mockKPIs));
      return mockKPIs;
    }
  } else {
    localStorage.setItem('allKPIs', JSON.stringify(mockKPIs));
    return mockKPIs;
  }
};

const saveAllKPIs = async (kpis: KPI[]): Promise<void> => {
  if (isRunningInDocker()) {
    try {
      await fetch(`${API_BASE_URL}/kpis`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ kpis }),
      });
    } catch (error) {
      console.warn('Error saving KPI data to backend:', error);
    }
  } else {
    localStorage.setItem('allKPIs', JSON.stringify(kpis));
  }
};

// Role and Permission Types
interface RoleCreate {
  name: string;
  is_custom?: boolean;
}

interface RoleUpdate {
  name: string;
  is_custom?: boolean;
}

interface RolePermissionCreate {
  role_id: number;
  permission_id: number;
}

export const apiService = {
  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // In Docker, use the real backend login endpoint
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          // Try to get the error message from the response
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Login failed with status: ${response.status}`);
          }
        }

        const data = await response.json();

        // Transform the user data to match the frontend's expected structure
        const transformedUser = {
          ...data.user,
          role: {
            ...data.user.role,
            isCustom: data.user.role.is_custom,
            permissions: data.user.role.permissions || []
          }
        };

        return {
          token: data.access_token,
          user: transformedUser
        };
      } catch (error: any) {
        console.error('Login error:', error);
        // Propagate the original error message if available
        if (error.message) {
          throw error;
        } else {
          throw new Error('An error occurred during login. Please try again.');
        }
      }
    } else {
      // In development, use the mock login flow
      const allUsers = await getAllUsers();
      const userPasswords = await getUserPasswords();

      // Find user by email
      const foundUser = allUsers.find(u => u.email === email);

      if (!foundUser) {
        throw new Error('User not found. Please check your email address.');
      }

      // Check password
      if (userPasswords[email] !== password) {
        throw new Error('Invalid password. Please check your password and try again.');
      }

      // Create a mock token
      const mockToken = btoa(JSON.stringify({ sub: foundUser.id, email: foundUser.email }));

      return {
        token: mockToken,
        user: foundUser
      };
    }
  },

  // User management
  async getUsers(): Promise<User[]> {
    await delay(500);

    // Use the getAllUsers implementation which already handles Docker and non-Docker environments
    return this.getAllUsers();
  },

  async getAllUsers(): Promise<User[]> {
    await delay(500);
    return getAllUsers(); // Call the standalone helper function
  },

  async createUser(userData: Omit<User, 'id' | 'createdAt'> & { password?: string }): Promise<User> {
    await delay(500);

    // If running in Docker, use the backend API to create the user
    if (isRunningInDocker() && userData.password) {
      try {
        // Create user in the backend (employee_eval.db)
        const response = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({
            email: userData.email,
            name: userData.name,
            password: userData.password,
            role_id: parseInt(userData.role.id),
            manager_id: userData.managerId ? parseInt(userData.managerId) : null
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to create user: ${response.status}`);
          }
        }

        // Get the created user from the response
        const createdUser = await response.json();

        // Return the created user
        return {
          id: createdUser.id.toString(),
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          managerId: createdUser.manager_id ? createdUser.manager_id.toString() : undefined,
          isActive: createdUser.is_active,
          createdAt: createdUser.created_at
        };
      } catch (error: any) {
        console.error('Error creating user:', error);
        throw error;
      }
    } else {
      // In development mode, use the mock flow
      const allUsers = await getAllUsers();
      const userPasswords = await getUserPasswords();

      // Check if user already exists
      const existingUser = allUsers.find(u => u.email === userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const newUser: User = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        managerId: userData.managerId,
        isActive: userData.isActive,
        createdAt: new Date().toISOString(),
      };

      allUsers.push(newUser);
      await saveAllUsers(allUsers);

      // Store password separately
      if (userData.password) {
        userPasswords[newUser.email] = userData.password;
        await saveUserPasswords(userPasswords);
        console.log('Password saved for:', newUser.email, 'Password:', userData.password);
      }

      return newUser;
    }
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    await delay(500);

    // If running in Docker, use the backend API to update the user
    if (isRunningInDocker()) {
      try {
        // Prepare the data for the backend API
        const updateData: any = {};

        // Map frontend fields to backend fields
        if (userData.name !== undefined) updateData.name = userData.name;
        if (userData.email !== undefined) updateData.email = userData.email;
        if (userData.isActive !== undefined) updateData.is_active = userData.isActive;
        if (userData.managerId !== undefined) updateData.manager_id = userData.managerId ? parseInt(userData.managerId) : null;
        if (userData.role?.id !== undefined) updateData.role_id = parseInt(userData.role.id);

        // Make the API call
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'PUT',
          headers: createAuthHeaders(),
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to update user: ${response.status}`);
          }
        }

        // Get the updated user from the response
        const updatedUser = await response.json();

        // Transform the user data to match the frontend's expected structure
        return {
          id: updatedUser.id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          role: {
            id: updatedUser.role.id.toString(),
            name: updatedUser.role.name,
            isCustom: updatedUser.role.is_custom,
            permissions: updatedUser.role.permissions || []
          },
          managerId: updatedUser.manager_id ? updatedUser.manager_id.toString() : undefined,
          isActive: updatedUser.is_active,
          createdAt: updatedUser.created_at
        };
      } catch (error: any) {
        console.error('Error updating user:', error);
        throw error;
      }
    } else {
      // In development mode, use the mock flow
      const allUsers = await getAllUsers();
      const index = allUsers.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');

      allUsers[index] = { ...allUsers[index], ...userData };
      await saveAllUsers(allUsers);

      return allUsers[index];
    }
  },

  async deleteUser(id: string): Promise<void> {
    await delay(500);

    // If running in Docker, use the backend API to delete the user
    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to delete user: ${response.status}`);
          }
        }

        return;
      } catch (error: any) {
        console.error('Error deleting user:', error);
        throw error;
      }
    } else {
      // In development mode, use the mock flow
      const allUsers = await getAllUsers();
      const index = allUsers.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');

      const userEmail = allUsers[index].email;
      allUsers.splice(index, 1);
      await saveAllUsers(allUsers);

      // Remove password
      const userPasswords = await getUserPasswords();
      delete userPasswords[userEmail];
      await saveUserPasswords(userPasswords);
    }
  },

  // KPI management
  async getKPIs(): Promise<KPI[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch KPIs: ${response.status}`);
        }

        const kpis = await response.json();

        // Transform the data to match the frontend interface
        return kpis.map((kpi: any) => ({
          id: kpi.id.toString(),
          title: kpi.title,
          description: kpi.description,
          weightage: kpi.weightage,
          type: kpi.type,
          category: kpi.is_technical ? 'technical' : 'admin',
          targetRoleId: kpi.target_role_id ? kpi.target_role_id.toString() : undefined,
          targetEmployeeId: kpi.target_employee_id ? kpi.target_employee_id.toString() : undefined,
          status: kpi.status,
          createdBy: kpi.created_by.toString(),
          createdAt: kpi.created_at,
          managerId: kpi.manager_id ? kpi.manager_id.toString() : undefined,
          isTechnical: kpi.is_technical
        }));
      } catch (error) {
        console.error('Error fetching KPIs from backend:', error);
        // Fallback to mock data
        return await getAllKPIs();
      }
    } else {
      return await getAllKPIs();
    }
  },

  async getManagerKPIs(filters?: { status?: string; type?: string; sortBy?: string }): Promise<KPI[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // Build query parameters
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.type) queryParams.append('type', filters.type);
        if (filters?.sortBy) queryParams.append('sort_by', filters.sortBy);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const response = await fetch(`${API_BASE_URL}/kpis/managed${queryString}`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Not authorized to view managed KPIs');
          } else {
            throw new Error(`Failed to fetch managed KPIs: ${response.status}`);
          }
        }

        const kpis = await response.json();

        // Transform the data to match the frontend interface
        return kpis.map((kpi: any) => ({
          id: kpi.id.toString(),
          title: kpi.title,
          description: kpi.description,
          weightage: kpi.weightage,
          type: kpi.type,
          category: kpi.is_technical ? 'technical' : 'admin',
          targetRoleId: kpi.target_role_id ? kpi.target_role_id.toString() : undefined,
          targetEmployeeId: kpi.target_employee_id ? kpi.target_employee_id.toString() : undefined,
          status: kpi.status,
          createdBy: kpi.created_by.toString(),
          createdAt: kpi.created_at,
          managerId: kpi.manager_id ? kpi.manager_id.toString() : undefined,
          isTechnical: kpi.is_technical
        }));
      } catch (error) {
        console.error('Error fetching managed KPIs from backend:', error);
        // Fallback to client-side filtering if backend call fails
        return await this.getManagerKPIsFallback(filters);
      }
    } else {
      return await this.getManagerKPIsFallback(filters);
    }
  },

  // Fallback method using client-side filtering
  async getManagerKPIsFallback(filters?: { status?: string; type?: string; sortBy?: string }): Promise<KPI[]> {
    // Get all KPIs
    const allKPIs = await this.getKPIs();
    const user = JSON.parse(localStorage.getItem('current_user') || '{}');

    // Filter KPIs created by the current user
    let filteredKPIs = allKPIs.filter(kpi => kpi.createdBy === user.id);

    // Apply additional filters if provided
    if (filters?.status) {
      filteredKPIs = filteredKPIs.filter(kpi => kpi.status === filters.status);
    }

    if (filters?.type) {
      filteredKPIs = filteredKPIs.filter(kpi => kpi.type === filters.type);
    }

    // Apply sorting if provided
    if (filters?.sortBy) {
      filteredKPIs.sort((a, b) => {
        if (filters.sortBy === 'created_at') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (filters.sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (filters.sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }
        return 0;
      });
    } else {
      // Default sorting by created_at (newest first)
      filteredKPIs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filteredKPIs;
  },

  async getEmployeeKPIWeightage(employeeId: string): Promise<{ admin_weightage: number, manager_weightage: number, total_weightage: number, kpis?: any[] }> {
    await delay(300);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis/employee/${employeeId}/weightage`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employee not found');
          } else if (response.status === 403) {
            throw new Error('Not authorized to view this employee\'s KPI weightage');
          } else {
            throw new Error(`Failed to fetch employee KPI weightage: ${response.status}`);
          }
        }

        const weightageInfo = await response.json();
        return weightageInfo;
      } catch (error) {
        console.error('Error fetching employee KPI weightage from backend:', error);
        // Return default values if backend call fails
        return {
          admin_weightage: 0,
          manager_weightage: 0,
          total_weightage: 0,
          kpis: []
        };
      }
    } else {
      // In development mode, calculate weightage from mock data
      const allKPIs = await this.getKPIs();
      const allUsers = await this.getAllUsers();
      const employee = allUsers.find(u => u.id === employeeId);

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Filter KPIs applicable to this employee
      const employeeKPIs = allKPIs.filter(kpi => 
        kpi.status === 'active' && (
          kpi.type === 'global' ||
          (kpi.type === 'role-based' && kpi.targetRoleId === employee.role.id) ||
          (kpi.type === 'employee-specific' && kpi.targetEmployeeId === employeeId)
        )
      );

      // Calculate admin weightage (KPIs with managerId = 0 or created by admin)
      const adminKPIs = employeeKPIs.filter(kpi => 
        kpi.managerId === '0' || 
        (allUsers.find(u => u.id === kpi.createdBy)?.role.name.toLowerCase() === 'admin' && 
         kpi.createdBy !== kpi.managerId)
      );
      const adminWeightage = adminKPIs.reduce((sum, kpi) => sum + kpi.weightage, 0);

      // Calculate manager weightage (all other KPIs)
      const managerKPIs = employeeKPIs.filter(kpi => 
        kpi.managerId !== '0' && 
        !(allUsers.find(u => u.id === kpi.createdBy)?.role.name.toLowerCase() === 'admin' && 
          kpi.createdBy !== kpi.managerId)
      );
      const managerWeightage = managerKPIs.reduce((sum, kpi) => sum + kpi.weightage, 0);

      // Create KPI details for the new format
      const kpiDetails = employeeKPIs.map(kpi => {
        const creator = allUsers.find(u => u.id === kpi.createdBy);
        return {
          id: kpi.id,
          title: kpi.title,
          weightage: kpi.weightage,
          is_technical: kpi.isTechnical,
          creator_name: creator?.name || "Unknown",
          type: kpi.type
        };
      });

      return {
        admin_weightage: adminWeightage,
        manager_weightage: managerWeightage,
        total_weightage: adminWeightage + managerWeightage,
        kpis: kpiDetails
      };
    }
  },

  async getEmployeeKPIs(employeeId: string): Promise<KPI[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis/employee/${employeeId}`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employee not found');
          } else if (response.status === 403) {
            throw new Error('Not authorized to view this employee\'s KPIs');
          } else {
            throw new Error(`Failed to fetch employee KPIs: ${response.status}`);
          }
        }

        const kpis = await response.json();

        // Transform the data to match the frontend interface
        return kpis.map((kpi: any) => ({
          id: kpi.id.toString(),
          title: kpi.title,
          description: kpi.description,
          weightage: kpi.weightage,
          type: kpi.type,
          category: kpi.is_technical ? 'technical' : 'admin',
          targetRoleId: kpi.target_role_id ? kpi.target_role_id.toString() : undefined,
          targetEmployeeId: kpi.target_employee_id ? kpi.target_employee_id.toString() : undefined,
          status: kpi.status,
          createdBy: kpi.created_by.toString(),
          createdAt: kpi.created_at,
          managerId: kpi.manager_id ? kpi.manager_id.toString() : undefined,
          isTechnical: kpi.is_technical
        }));
      } catch (error) {
        console.error('Error fetching employee KPIs from backend:', error);
        // Fallback to client-side filtering if backend call fails
        return await this.getEmployeeKPIsFallback(employeeId);
      }
    } else {
      return await this.getEmployeeKPIsFallback(employeeId);
    }
  },

  // Fallback method using client-side filtering
  async getEmployeeKPIsFallback(employeeId: string): Promise<KPI[]> {
    // Get all KPIs
    const allKPIs = await this.getKPIs();

    // Filter KPIs that are:
    // 1. Global (applicable to all employees)
    // 2. Role-based (matching the employee's role)
    // 3. Employee-specific (specifically assigned to this employee)

    // First, get the employee to determine their role
    const allUsers = await this.getAllUsers();
    const employee = allUsers.find(u => u.id === employeeId);

    if (!employee) {
      throw new Error('Employee not found');
    }

    return allKPIs.filter(kpi => 
      // Only include active KPIs
      kpi.status === 'active' && (
        // Global KPIs
        kpi.type === 'global' ||
        // Role-based KPIs matching employee's role
        (kpi.type === 'role-based' && kpi.targetRoleId === employee.role.id) ||
        // Employee-specific KPIs
        (kpi.type === 'employee-specific' && kpi.targetEmployeeId === employeeId)
      )
    );
  },

  async createKPI(kpiData: Omit<KPI, 'id' | 'createdAt'>): Promise<KPI> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify(kpiData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to create KPI: ${response.status}`);
          }
        }

        const kpi = await response.json();

        // Transform the response to match the frontend interface
        return {
          id: kpi.id.toString(),
          title: kpi.title,
          description: kpi.description,
          weightage: kpi.weightage,
          type: kpi.type,
          category: kpi.is_technical ? 'technical' : 'admin',
          targetRoleId: kpi.target_role_id ? kpi.target_role_id.toString() : undefined,
          targetEmployeeId: kpi.target_employee_id ? kpi.target_employee_id.toString() : undefined,
          status: kpi.status,
          createdBy: kpi.created_by.toString(),
          createdAt: kpi.created_at,
          managerId: kpi.manager_id ? kpi.manager_id.toString() : undefined,
          isTechnical: kpi.is_technical
        };
      } catch (error) {
        console.error('Error creating KPI:', error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const allKPIs = await getAllKPIs();
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');

      // Check if the user is a manager or admin
      const isManager = user.role && user.role.name.toLowerCase() === 'manager';
      const isAdmin = user.role && user.role.name.toLowerCase() === 'admin';

      const newKPI: KPI = {
        ...kpiData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        // If user is a manager, set managerId and isTechnical
        managerId: isManager ? user.id : (isAdmin ? '0' : kpiData.managerId),
        // For admin users, use the provided isTechnical value or default to true
        isTechnical: isManager ? true : (kpiData.isTechnical !== undefined ? kpiData.isTechnical : (isAdmin ? true : false)),
        category: isManager ? 'technical' : (kpiData.isTechnical ? 'technical' : 'admin')
      };

      allKPIs.push(newKPI);
      await saveAllKPIs(allKPIs);

      return newKPI;
    }
  },

  async createManagerKPI(kpiData: Omit<KPI, 'id' | 'createdAt' | 'isTechnical'>): Promise<KPI> {
    // Use the regular createKPI method with isTechnical set to true
    return this.createKPI({
      ...kpiData,
      isTechnical: true,
      category: 'technical'
    });
  },

  async updateKPI(id: string, kpiData: Partial<KPI>): Promise<KPI> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis/${id}`, {
          method: 'PUT',
          headers: createAuthHeaders(),
          body: JSON.stringify(kpiData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to update KPI: ${response.status}`);
          }
        }

        const kpi = await response.json();

        // Transform the response to match the frontend interface
        return {
          id: kpi.id.toString(),
          title: kpi.title,
          description: kpi.description,
          weightage: kpi.weightage,
          type: kpi.type,
          category: kpi.is_technical ? 'technical' : 'admin',
          targetRoleId: kpi.target_role_id ? kpi.target_role_id.toString() : undefined,
          targetEmployeeId: kpi.target_employee_id ? kpi.target_employee_id.toString() : undefined,
          status: kpi.status,
          createdBy: kpi.created_by.toString(),
          createdAt: kpi.created_at,
          managerId: kpi.manager_id ? kpi.manager_id.toString() : undefined,
          isTechnical: kpi.is_technical
        };
      } catch (error) {
        console.error('Error updating KPI:', error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const allKPIs = await getAllKPIs();
      const index = allKPIs.findIndex(k => k.id === id);
      if (index === -1) throw new Error('KPI not found');

      allKPIs[index] = { ...allKPIs[index], ...kpiData };
      await saveAllKPIs(allKPIs);

      return allKPIs[index];
    }
  },

  async updateManagerKPI(id: string, kpiData: Partial<KPI>): Promise<KPI> {
    // Use the regular updateKPI method but ensure isTechnical remains true
    return this.updateKPI(id, {
      ...kpiData,
      isTechnical: true,
      category: 'technical'
    });
  },

  async deleteKPI(id: string): Promise<void> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis/${id}`, {
          method: 'DELETE',
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to delete KPI: ${response.status}`);
          }
        }
      } catch (error) {
        console.error('Error deleting KPI:', error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const allKPIs = await getAllKPIs();
      const index = allKPIs.findIndex(k => k.id === id);
      if (index === -1) throw new Error('KPI not found');

      allKPIs.splice(index, 1);
      await saveAllKPIs(allKPIs);
    }
  },

  async deleteManagerKPI(id: string): Promise<void> {
    // Use the regular deleteKPI method
    return this.deleteKPI(id);
  },

  // Evaluation management
  async getEvaluations(filters?: { department?: string; managerId?: string; status?: string }): Promise<Evaluation[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // Build query parameters
        const queryParams = new URLSearchParams();

        if (filters?.department) {
          queryParams.append('department', filters.department);
        }

        if (filters?.managerId) {
          queryParams.append('manager_id', filters.managerId);
        }

        if (filters?.status) {
          queryParams.append('status', filters.status);
        }

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const response = await fetch(`${API_BASE_URL}/evaluations${queryString}`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch evaluations: ${response.status}`);
        }

        const data = await response.json();

        // Transform the data to match the frontend interface
        return data.map((evaluation: any) => ({
          id: evaluation.id.toString(),
          employeeId: evaluation.employee_id.toString(),
          managerId: evaluation.manager_id.toString(),
          period: evaluation.period,
          rawScore: evaluation.raw_score,
          normalizedScore: evaluation.normalized_score,
          performanceLabel: evaluation.performance_label,
          incrementPercentage: evaluation.increment_percentage,
          status: evaluation.status,
          comments: evaluation.comments,
          managerComments: evaluation.manager_comments,
          adminComments: evaluation.admin_comments,
          createdAt: evaluation.created_at,
          updatedAt: evaluation.updated_at,
          submittedAt: evaluation.submitted_at,
          approvedAt: evaluation.approved_at,
          rejectedAt: evaluation.rejected_at,
          createdBy: evaluation.created_by.toString(),
          kpiEvaluations: evaluation.kpi_evaluations ? evaluation.kpi_evaluations.map((kpiEval: any) => ({
            id: kpiEval.id.toString(),
            kpiId: kpiEval.kpi_id.toString(),
            title: kpiEval.title,
            description: kpiEval.description,
            category: kpiEval.category,
            weightage: kpiEval.weightage,
            rating: kpiEval.rating,
            comment: kpiEval.comment,
            createdAt: kpiEval.created_at,
            updatedAt: kpiEval.updated_at
          })) : [],
          permissions: evaluation.permissions
        }));
      } catch (error) {
        console.error('Error fetching evaluations from backend:', error);
        // Fallback to mock data if backend call fails
        return mockEvaluations;
      }
    } else {
      // For development environment, use mock data
      return mockEvaluations;
    }
  },

  async getEmployeeEvaluations(
    employeeId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: { status?: string; period?: string }
  ): Promise<PaginatedEvaluationResponse> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('page_size', pageSize.toString());

        if (filters?.status) {
          queryParams.append('status', filters.status);
        }

        if (filters?.period) {
          queryParams.append('period', filters.period);
        }

        const response = await fetch(
          `${API_BASE_URL}/evaluations/employee/${employeeId}?${queryParams.toString()}`,
          {
            headers: createAuthHeaders()
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Employee not found');
          } else if (response.status === 403) {
            throw new Error('Not authorized to view this employee\'s evaluations');
          } else {
            throw new Error(`Failed to fetch employee evaluations: ${response.status}`);
          }
        }

        const data = await response.json();

        // Transform the data to match the frontend interface
        return {
          items: data.items.map((evaluation: any) => ({
            id: evaluation.id.toString(),
            employeeId: evaluation.employee_id.toString(),
            managerId: evaluation.manager_id.toString(),
            period: evaluation.period,
            rawScore: evaluation.raw_score,
            normalizedScore: evaluation.normalized_score,
            performanceLabel: evaluation.performance_label,
            incrementPercentage: evaluation.increment_percentage,
            status: evaluation.status,
            comments: evaluation.comments,
            managerComments: evaluation.manager_comments,
            adminComments: evaluation.admin_comments,
            createdAt: evaluation.created_at,
            updatedAt: evaluation.updated_at,
            submittedAt: evaluation.submitted_at,
            approvedAt: evaluation.approved_at,
            rejectedAt: evaluation.rejected_at,
            createdBy: evaluation.created_by.toString(),
            kpiEvaluations: evaluation.kpi_evaluations.map((kpiEval: any) => ({
              id: kpiEval.id.toString(),
              kpiId: kpiEval.kpi_id.toString(),
              title: kpiEval.title,
              description: kpiEval.description,
              category: kpiEval.category,
              weightage: kpiEval.weightage,
              rating: kpiEval.rating,
              comment: kpiEval.comment,
              createdAt: kpiEval.created_at,
              updatedAt: kpiEval.updated_at
            })),
            permissions: {
              can_view_increment_percentage: evaluation.permissions.can_view_increment_percentage,
              can_view_admin_comments: evaluation.permissions.can_view_admin_comments,
              can_edit: evaluation.permissions.can_edit,
              can_approve: evaluation.permissions.can_approve
            }
          })),
          total: data.total,
          page: data.page,
          page_size: data.page_size,
          total_pages: data.total_pages
        };
      } catch (error) {
        console.error('Error fetching employee evaluations from backend:', error);
        // Fallback to client-side implementation if backend call fails
        return await this.getEmployeeEvaluationsFallback(employeeId, page, pageSize, filters);
      }
    } else {
      return await this.getEmployeeEvaluationsFallback(employeeId, page, pageSize, filters);
    }
  },

  // Fallback method for development environment
  async getEmployeeEvaluationsFallback(
    employeeId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: { status?: string; period?: string }
  ): Promise<PaginatedEvaluationResponse> {
    // Filter evaluations for the specified employee
    let filteredEvaluations = mockEvaluations.filter(
      evaluation => evaluation.employeeId === employeeId
    );

    // Apply additional filters if provided
    if (filters?.status) {
      filteredEvaluations = filteredEvaluations.filter(
        evaluation => evaluation.status === filters.status
      );
    }

    if (filters?.period) {
      filteredEvaluations = filteredEvaluations.filter(
        evaluation => evaluation.period === filters.period
      );
    }

    // Sort by created_at (newest first)
    filteredEvaluations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate pagination
    const total = filteredEvaluations.length;
    const totalPages = Math.ceil(total / pageSize);
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    const start = (validPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedItems = filteredEvaluations.slice(start, end);

    return {
      items: paginatedItems,
      total,
      page: validPage,
      page_size: pageSize,
      total_pages: totalPages
    };
  },

  async createEvaluation(evaluationData: Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt' | 'approvedAt' | 'rejectedAt' | 'rawScore' | 'normalizedScore' | 'performanceLabel' | 'incrementPercentage' | 'createdBy'> & { submittedBy?: string; cycleId?: string }): Promise<Evaluation> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // Validate required fields
        if (!evaluationData.employeeId) {
          throw new Error('Employee ID is required');
        }
        
        if (!evaluationData.managerId) {
          throw new Error('Manager ID is required');
        }
        
        if (evaluationData.status === 'submitted' && !evaluationData.submittedBy) {
          throw new Error('User information is missing: submittedBy is required');
        }
        
        if (!evaluationData.period) {
          throw new Error('Period is required');
        }
        
        if (!evaluationData.kpiEvaluations || evaluationData.kpiEvaluations.length === 0) {
          throw new Error('At least one KPI evaluation is required');
        }
        
        // If cycleId is not provided, try to get the active cycle
        let cycleId = evaluationData.cycleId;
        if (!cycleId) {
          const activeCycle = await this.getActiveEvaluationCycle();
          if (activeCycle) {
            cycleId = activeCycle.id;
          }
        }
        
        // Calculate scores
        const rawScore = this.calculateRawScore(evaluationData.kpiEvaluations);
        const normalizedScore = this.calculateNormalizedScore(rawScore);
        const performanceLabel = this.getPerformanceLabel(normalizedScore);
        const incrementPercentage = this.calculateIncrementPercentage(normalizedScore);
        
        // Ensure all IDs are numbers
        const employeeId = typeof evaluationData.employeeId === 'string' ? parseInt(evaluationData.employeeId) : evaluationData.employeeId;
        const managerId = typeof evaluationData.managerId === 'string' ? parseInt(evaluationData.managerId) : evaluationData.managerId;
        const submittedBy = typeof evaluationData.submittedBy === 'string' ? parseInt(evaluationData.submittedBy) : evaluationData.submittedBy;
        const parsedCycleId = cycleId ? (typeof cycleId === 'string' ? parseInt(cycleId) : cycleId) : undefined;
        
        // Prepare the request payload
        const payload = {
          employee_id: employeeId,
          manager_id: managerId,
          period: evaluationData.period,
          cycle_id: parsedCycleId,
          kpi_evaluations: evaluationData.kpiEvaluations.map(kpiEval => ({
            kpi_id: typeof kpiEval.kpiId === 'string' ? parseInt(kpiEval.kpiId) : kpiEval.kpiId,
            title: kpiEval.title,
            description: kpiEval.description,
            category: kpiEval.category,
            weightage: kpiEval.weightage,
            rating: kpiEval.rating,
            comment: kpiEval.comment
          })),
          status: evaluationData.status || 'draft',
          comments: evaluationData.comments,
          manager_comments: evaluationData.managerComments,
          admin_comments: evaluationData.adminComments
        };
        
        console.log('Creating evaluation with payload:', payload);
        
        const response = await fetch(`${API_BASE_URL}/evaluations`, {
          method: 'POST',
          headers: {
            ...createAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          }
          throw new Error(`Failed to create evaluation: ${response.status}`);
        }

        const evaluation = await response.json();
        console.log('Evaluation created successfully:', evaluation);

        // Transform the data to match the frontend interface
        return {
          id: evaluation.id.toString(),
          employeeId: evaluation.employee_id.toString(),
          managerId: evaluation.manager_id.toString(),
          period: evaluation.period,
          rawScore: evaluation.raw_score,
          normalizedScore: evaluation.normalized_score,
          performanceLabel: evaluation.performance_label,
          incrementPercentage: evaluation.increment_percentage,
          status: evaluation.status,
          comments: evaluation.comments,
          managerComments: evaluation.manager_comments,
          adminComments: evaluation.admin_comments,
          createdAt: evaluation.created_at,
          updatedAt: evaluation.updated_at,
          submittedAt: evaluation.submitted_at,
          approvedAt: evaluation.approved_at,
          rejectedAt: evaluation.rejected_at,
          createdBy: evaluation.created_by.toString(),
          draftedBy: evaluation.drafted_by ? evaluation.drafted_by.toString() : undefined,
          kpiEvaluations: (evaluation.kpi_evaluations || []).map((kpiEval: any) => ({
            id: kpiEval.id.toString(),
            kpiId: kpiEval.kpi_id.toString(),
            title: kpiEval.title,
            description: kpiEval.description,
            category: kpiEval.category,
            weightage: kpiEval.weightage,
            rating: kpiEval.rating,
            comment: kpiEval.comment
          })),
          permissions: evaluation.permissions
        };
      } catch (error) {
        console.error('Error creating evaluation:', error);
        throw error;
      }
    }

    // Mock implementation for non-Docker environments
    // Prepare KPI evaluations with snapshot data
    const kpiEvaluations = await Promise.all(
      evaluationData.kpiEvaluations.map(async (kpiEval) => {
        // If we don't have title/description/category, fetch from KPI
        if (!kpiEval.title || !kpiEval.description || !kpiEval.category) {
          try {
            const kpi = await this.getKPI(kpiEval.kpiId);
            return {
              ...kpiEval,
              title: kpiEval.title || kpi.title,
              description: kpiEval.description || kpi.description,
              category: kpiEval.category || kpi.category,
              weightage: kpiEval.weightage || kpi.weightage,
            };
          } catch (error) {
            console.error(`Error fetching KPI ${kpiEval.kpiId}:`, error);
            return kpiEval;
          }
        }
        return kpiEval;
      })
    );

    // Calculate scores
    const rawScore = this.calculateRawScore(kpiEvaluations);
    const normalizedScore = this.calculateNormalizedScore(rawScore);
    const performanceLabel = this.getPerformanceLabel(normalizedScore);
    const incrementPercentage = this.calculateIncrementPercentage(normalizedScore);

    // Use the provided submittedBy parameter instead of trying to get the current user
    if (!evaluationData.submittedBy) {
      throw new Error('User information is missing: submittedBy is required');
    }

    const newEvaluation: Evaluation = {
      ...evaluationData,
      kpiEvaluations,
      rawScore,
      normalizedScore,
      performanceLabel,
      incrementPercentage,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: evaluationData.submittedBy,
    };
    mockEvaluations.push(newEvaluation);
    return newEvaluation;
  },

  async startEvaluation(employeeId: string, period: string, comments?: string): Promise<Evaluation> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluations/start`, {
          method: 'POST',
          headers: {
            ...createAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employee_id: parseInt(employeeId),
            period,
            comments
          })
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Not authorized to start evaluations');
          } else if (response.status === 404) {
            throw new Error('Employee not found');
          } else if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to start evaluation');
          } else {
            throw new Error(`Failed to start evaluation: ${response.status}`);
          }
        }

        const evaluation = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: evaluation.id.toString(),
          employeeId: evaluation.employee_id.toString(),
          managerId: evaluation.manager_id.toString(),
          period: evaluation.period,
          rawScore: evaluation.raw_score,
          normalizedScore: evaluation.normalized_score,
          performanceLabel: evaluation.performance_label,
          incrementPercentage: evaluation.increment_percentage,
          status: evaluation.status,
          comments: evaluation.comments,
          managerComments: evaluation.manager_comments,
          adminComments: evaluation.admin_comments,
          createdAt: evaluation.created_at,
          updatedAt: evaluation.updated_at,
          submittedAt: evaluation.submitted_at,
          approvedAt: evaluation.approved_at,
          rejectedAt: evaluation.rejected_at,
          createdBy: evaluation.created_by.toString(),
          kpiEvaluations: evaluation.kpi_evaluations.map((kpiEval: any) => ({
            id: kpiEval.id.toString(),
            kpiId: kpiEval.kpi_id.toString(),
            title: kpiEval.title,
            description: kpiEval.description,
            category: kpiEval.category,
            weightage: kpiEval.weightage,
            rating: kpiEval.rating,
            comment: kpiEval.comment,
            createdAt: kpiEval.created_at,
            updatedAt: kpiEval.updated_at
          })),
          permissions: {
            canViewIncrementPercentage: evaluation.permissions.can_view_increment_percentage,
            canViewAdminComments: evaluation.permissions.can_view_admin_comments,
            canEdit: evaluation.permissions.can_edit,
            canApprove: evaluation.permissions.can_approve
          }
        };
      } catch (error) {
        console.error('Error starting evaluation from backend:', error);
        // Fallback to client-side implementation if backend call fails
        return await this.startEvaluationFallback(employeeId, period, comments);
      }
    } else {
      return await this.startEvaluationFallback(employeeId, period, comments);
    }
  },

  // Fallback method for development environment
  async startEvaluationFallback(employeeId: string, period: string, comments?: string): Promise<Evaluation> {
    // Get the employee's KPIs
    const kpis = await this.getEmployeeKPIs(employeeId);

    // Get the employee
    const employee = await this.getUser(employeeId);

    // Get the current user
    const currentUser = await this.getCurrentUser();

    // Create empty KPI evaluations
    const kpiEvaluations = kpis.map(kpi => ({
      id: `temp_${Date.now()}_${kpi.id}`,
      kpiId: kpi.id,
      title: kpi.title,
      description: kpi.description,
      category: kpi.category,
      weightage: kpi.weightage,
      rating: 0, // Initial rating is 0
      comment: '', // No comment yet
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Create the evaluation
    const newEvaluation: Evaluation = {
      id: Date.now().toString(),
      employeeId,
      managerId: employee.managerId || currentUser.id,
      period,
      rawScore: 0, // Initial score is 0
      normalizedScore: 0, // Initial normalized score is 0
      performanceLabel: '', // No performance label yet
      incrementPercentage: 0, // No increment percentage yet
      status: 'draft', // Set status to draft
      comments: comments || '',
      managerComments: '',
      adminComments: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.id,
      kpiEvaluations,
      permissions: {
        canViewIncrementPercentage: currentUser.role.name.toLowerCase() === 'admin',
        canViewAdminComments: currentUser.role.name.toLowerCase() === 'admin',
        canEdit: currentUser.role.name.toLowerCase() === 'admin' || 
                (currentUser.role.name.toLowerCase() === 'manager' && 
                (employee.managerId === currentUser.id || currentUser.id === currentUser.id)),
        canApprove: currentUser.role.name.toLowerCase() === 'admin'
      }
    };

    mockEvaluations.push(newEvaluation);
    return newEvaluation;
  },

  async submitEvaluation(id: string, evaluationData: { 
    kpiEvaluations: Array<{
      kpiId: string;
      title: string;
      description: string;
      category: string;
      weightage: number;
      rating: number;
      comment?: string;
    }>;
    comments?: string;
    managerComments?: string;
  }): Promise<Evaluation> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // Transform the data to match the backend interface
        const requestData = {
          kpi_evaluations: evaluationData.kpiEvaluations.map(kpiEval => ({
            kpi_id: parseInt(kpiEval.kpiId),
            title: kpiEval.title,
            description: kpiEval.description,
            category: kpiEval.category,
            weightage: kpiEval.weightage,
            rating: kpiEval.rating,
            comment: kpiEval.comment
          })),
          comments: evaluationData.comments,
          manager_comments: evaluationData.managerComments
        };

        const response = await fetch(`${API_BASE_URL}/evaluations/${id}/submit`, {
          method: 'PUT',
          headers: {
            ...createAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Not authorized to submit evaluations');
          } else if (response.status === 404) {
            throw new Error('Evaluation not found');
          } else if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to submit evaluation');
          } else {
            throw new Error(`Failed to submit evaluation: ${response.status}`);
          }
        }

        const evaluation = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: evaluation.id.toString(),
          employeeId: evaluation.employee_id.toString(),
          managerId: evaluation.manager_id.toString(),
          period: evaluation.period,
          rawScore: evaluation.raw_score,
          normalizedScore: evaluation.normalized_score,
          performanceLabel: evaluation.performance_label,
          incrementPercentage: evaluation.increment_percentage,
          status: evaluation.status,
          comments: evaluation.comments,
          managerComments: evaluation.manager_comments,
          adminComments: evaluation.admin_comments,
          createdAt: evaluation.created_at,
          updatedAt: evaluation.updated_at,
          submittedAt: evaluation.submitted_at,
          approvedAt: evaluation.approved_at,
          rejectedAt: evaluation.rejected_at,
          createdBy: evaluation.created_by.toString(),
          draftedBy: evaluation.drafted_by ? evaluation.drafted_by.toString() : undefined,
          kpiEvaluations: evaluation.kpi_evaluations.map((kpiEval: any) => ({
            id: kpiEval.id.toString(),
            kpiId: kpiEval.kpi_id.toString(),
            title: kpiEval.title,
            description: kpiEval.description,
            category: kpiEval.category,
            weightage: kpiEval.weightage,
            rating: kpiEval.rating,
            comment: kpiEval.comment,
            createdAt: kpiEval.created_at,
            updatedAt: kpiEval.updated_at
          })),
          permissions: {
            canViewIncrementPercentage: evaluation.permissions.can_view_increment_percentage,
            canViewAdminComments: evaluation.permissions.can_view_admin_comments,
            canEdit: evaluation.permissions.can_edit,
            canApprove: evaluation.permissions.can_approve
          }
        };
      } catch (error) {
        console.error('Error submitting evaluation to backend:', error);
        // Fallback to client-side implementation if backend call fails
        return await this.submitEvaluationFallback(id, evaluationData);
      }
    } else {
      return await this.submitEvaluationFallback(id, evaluationData);
    }
  },

  // Fallback method for development environment
  async submitEvaluationFallback(id: string, evaluationData: { 
    kpiEvaluations: Array<{
      kpiId: string;
      title: string;
      description: string;
      category: string;
      weightage: number;
      rating: number;
      comment?: string;
    }>;
    comments?: string;
    managerComments?: string;
  }): Promise<Evaluation> {
    // Find the evaluation in mock data
    const index = mockEvaluations.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Evaluation not found');

    // Create a copy of the evaluation
    const evaluation = { ...mockEvaluations[index] };

    // Update KPI evaluations
    evaluation.kpiEvaluations = evaluationData.kpiEvaluations.map(kpiEval => ({
      id: `${id}_${kpiEval.kpiId}`,
      kpiId: kpiEval.kpiId,
      title: kpiEval.title,
      description: kpiEval.description,
      category: kpiEval.category,
      weightage: kpiEval.weightage,
      rating: kpiEval.rating,
      comment: kpiEval.comment || '',
      createdAt: evaluation.createdAt,
      updatedAt: new Date().toISOString()
    }));

    // Update comments if provided
    if (evaluationData.comments !== undefined) {
      evaluation.comments = evaluationData.comments;
    }
    if (evaluationData.managerComments !== undefined) {
      evaluation.managerComments = evaluationData.managerComments;
    }

    // Calculate scores
    evaluation.rawScore = this.calculateRawScore(evaluation.kpiEvaluations);
    evaluation.normalizedScore = this.calculateNormalizedScore(evaluation.rawScore);
    evaluation.performanceLabel = this.getPerformanceLabel(evaluation.normalizedScore);
    evaluation.incrementPercentage = this.calculateIncrementPercentage(evaluation.normalizedScore);

    // Update status and timestamps
    evaluation.status = 'submitted';
    evaluation.updatedAt = new Date().toISOString();
    evaluation.submittedAt = new Date().toISOString();
    
    // Set submitted_by to current user and clear drafted_by
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser && currentUser.id) {
      evaluation.draftedBy = undefined; // Clear drafted_by when submitting
    }

    // Update the evaluation in mock data
    mockEvaluations[index] = evaluation;

    // Create mock notifications
    // In a real implementation, this would be handled by the backend

    return evaluation;
  },

  async updateEvaluation(id: string, evaluationData: any): Promise<Evaluation> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${String(id)}`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(evaluationData),
    });
    if (!response.ok) throw new Error('Failed to update evaluation');
    return await response.json();
  },

  // Evaluation Cycles
  async getActiveEvaluationCycle(): Promise<EvaluationCycle | null> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles?status=active`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch active evaluation cycle: ${response.status}`);
        }

        const data = await response.json();
        
        // If there are no active cycles, return null
        if (!data || data.length === 0) {
          return null;
        }

        // Get the first active cycle (there should be only one)
        const cycle = data[0];

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage,
          remainingDays: cycle.remaining_days
        };
      } catch (error) {
        console.error('Error fetching active evaluation cycle from backend:', error);
        return null;
      }
    } else {
      // If not in Docker, return null (no mock data for cycles yet)
      return null;
    }
  },

  async getEvaluationCycles(filters?: { status?: string }): Promise<EvaluationCycle[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        let url = `${API_BASE_URL}/evaluation-cycles`;

        // Add query parameters if filters are provided
        if (filters) {
          const queryParams = new URLSearchParams();
          if (filters.status) queryParams.append('status', filters.status);
          if (queryParams.toString()) url += `?${queryParams.toString()}`;
        }

        const response = await fetch(url, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch evaluation cycles: ${response.status}`);
        }

        const data = await response.json();

        // Transform the data to match the frontend interface
        return data.map((cycle: any) => ({
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage,
          remainingDays: cycle.remaining_days
        }));
      } catch (error) {
        console.error('Error fetching evaluation cycles from backend:', error);
        // Return empty array as fallback
        return [];
      }
    } else {
      // If not in Docker, return empty array (no mock data for cycles yet)
      return [];
    }
  },

  async getEvaluationCycle(id: string): Promise<EvaluationCycle> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles/${id}`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch evaluation cycle: ${response.status}`);
        }

        const cycle = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage,
          remainingDays: cycle.remaining_days
        };
      } catch (error) {
        console.error(`Error fetching evaluation cycle ${id} from backend:`, error);
        throw new Error('Evaluation cycle not found');
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Evaluation cycle not found');
    }
  },

  async createEvaluationCycle(cycleData: {
    name: string;
    evaluationStartDate: string;
    evaluationEndDate: string;
    executionStartDate: string;
    executionEndDate: string;
  }): Promise<EvaluationCycle> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({
            name: cycleData.name,
            evaluation_start_date: `${cycleData.evaluationStartDate}T00:00:00`,
            evaluation_end_date: `${cycleData.evaluationEndDate}T00:00:00`,
            execution_start_date: `${cycleData.executionStartDate}T00:00:00`,
            execution_end_date: `${cycleData.executionEndDate}T00:00:00`
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to create evaluation cycle: ${response.status}`);
        }

        const cycle = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage
        };
      } catch (error) {
        console.error('Error creating evaluation cycle:', error);
        throw error;
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Cannot create evaluation cycle in mock mode');
    }
  },

  async updateEvaluationCycle(id: string, cycleData: {
    name?: string;
    evaluationStartDate?: string;
    evaluationEndDate?: string;
    executionStartDate?: string;
    executionEndDate?: string;
    status?: string;
  }): Promise<EvaluationCycle> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles/${id}`, {
          method: 'PUT',
          headers: createAuthHeaders(),
          body: JSON.stringify({
            name: cycleData.name,
            evaluation_start_date: cycleData.evaluationStartDate ? `${cycleData.evaluationStartDate}T00:00:00` : undefined,
            evaluation_end_date: cycleData.evaluationEndDate ? `${cycleData.evaluationEndDate}T00:00:00` : undefined,
            execution_start_date: cycleData.executionStartDate ? `${cycleData.executionStartDate}T00:00:00` : undefined,
            execution_end_date: cycleData.executionEndDate ? `${cycleData.executionEndDate}T00:00:00` : undefined,
            status: cycleData.status
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to update evaluation cycle: ${response.status}`);
        }

        const cycle = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage
        };
      } catch (error) {
        console.error(`Error updating evaluation cycle ${id}:`, error);
        throw error;
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Cannot update evaluation cycle in mock mode');
    }
  },

  async deleteEvaluationCycle(id: string): Promise<void> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles/${id}`, {
          method: 'DELETE',
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to delete evaluation cycle: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error deleting evaluation cycle ${id}:`, error);
        throw error;
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Cannot delete evaluation cycle in mock mode');
    }
  },

  async activateEvaluationCycle(id: string): Promise<EvaluationCycle> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles/${id}/activate`, {
          method: 'POST',
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to activate evaluation cycle: ${response.status}`);
        }

        const cycle = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage
        };
      } catch (error) {
        console.error(`Error activating evaluation cycle ${id}:`, error);
        throw error;
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Cannot activate evaluation cycle in mock mode');
    }
  },

  async pauseEvaluationCycle(id: string): Promise<EvaluationCycle> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles/${id}/pause`, {
          method: 'POST',
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to pause evaluation cycle: ${response.status}`);
        }

        const cycle = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage
        };
      } catch (error) {
        console.error(`Error pausing evaluation cycle ${id}:`, error);
        throw error;
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Cannot pause evaluation cycle in mock mode');
    }
  },

  async stopEvaluationCycle(id: string): Promise<EvaluationCycle> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/evaluation-cycles/${id}/stop`, {
          method: 'POST',
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to stop evaluation cycle: ${response.status}`);
        }

        const cycle = await response.json();

        // Transform the data to match the frontend interface
        return {
          id: cycle.id.toString(),
          name: cycle.name,
          evaluationStartDate: cycle.evaluation_start_date,
          evaluationEndDate: cycle.evaluation_end_date,
          executionStartDate: cycle.execution_start_date,
          executionEndDate: cycle.execution_end_date,
          status: cycle.status,
          createdBy: cycle.created_by.toString(),
          createdAt: cycle.created_at,
          totalEvaluations: cycle.total_evaluations,
          completedEvaluations: cycle.completed_evaluations,
          progressPercentage: cycle.progress_percentage
        };
      } catch (error) {
        console.error(`Error stopping evaluation cycle ${id}:`, error);
        throw error;
      }
    } else {
      // If not in Docker, throw error (no mock data for cycles yet)
      throw new Error('Cannot stop evaluation cycle in mock mode');
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    await delay(500);
    return mockNotifications.filter(n => n.userId === userId);
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await delay(500);
    const notification = mockNotifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
    }
  },

  async createNotification(notificationData: NotificationCreate): Promise<Notification> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({
            user_id: notificationData.userId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            is_read: notificationData.isRead
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to create notification: ${response.status}`);
        }

        const data = await response.json();
        return {
          id: data.id.toString(),
          userId: data.user_id.toString(),
          type: data.type,
          title: data.title,
          message: data.message,
          isRead: data.is_read,
          createdAt: data.created_at
        };
      } catch (error) {
        console.error('Error creating notification:', error);
        // Fallback to mock implementation
        return createMockNotification(notificationData);
      }
    } else {
      // If not in Docker, use mock implementation
      return createMockNotification(notificationData);
    }
  },

  // Role management
  async getRoles(): Promise<Role[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch roles: ${response.status}`);
        }

        const data = await response.json();

        // Transform the data to match the frontend interface
        return data.map((role: any) => ({
          id: role.id.toString(),
          name: role.name,
          isCustom: role.is_custom,
          permissions: role.permissions.map((rp: any) => ({
            id: rp.id,
            role_id: rp.role_id,
            permission_id: rp.permission_id,
            permission: {
              id: rp.permission.id,
              name: rp.permission.name,
              description: rp.permission.description
            }
          }))
        }));
      } catch (error) {
        console.error('Error fetching roles from backend:', error);
        // Fallback to mock roles
        return mockRoles;
      }
    } else {
      // If not in Docker, use mock roles
      return mockRoles;
    }
  },

  async getRole(id: string): Promise<Role> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch role: ${response.status}`);
        }

        const role = await response.json();
        return {
          id: role.id.toString(),
          name: role.name,
          isCustom: role.is_custom,
          permissions: role.permissions.map((rp: any) => ({
            id: rp.id,
            role_id: rp.role_id,
            permission_id: rp.permission_id,
            permission: {
              id: rp.permission.id,
              name: rp.permission.name,
              description: rp.permission.description
            }
          }))
        };
      } catch (error) {
        console.error(`Error fetching role ${id} from backend:`, error);
        // Fallback to mock roles
        const role = mockRoles.find(r => r.id === id);
        if (!role) throw new Error('Role not found');
        return role;
      }
    } else {
      // If not in Docker, use mock roles
      const role = mockRoles.find(r => r.id === id);
      if (!role) throw new Error('Role not found');
      return role;
    }
  },

  async createRole(roleData: RoleCreate): Promise<Role> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify(roleData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to create role: ${response.status}`);
          }
        }

        const role = await response.json();
        return {
          id: role.id.toString(),
          name: role.name,
          isCustom: role.is_custom,
          permissions: []
        };
      } catch (error) {
        console.error('Error creating role:', error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const newRole: Role = {
        id: (mockRoles.length + 1).toString(),
        name: roleData.name,
        isCustom: roleData.is_custom !== undefined ? roleData.is_custom : true,
        permissions: []
      };
      mockRoles.push(newRole);
      return newRole;
    }
  },

  async updateRole(id: string, roleData: RoleUpdate): Promise<Role> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
          method: 'PUT',
          headers: createAuthHeaders(),
          body: JSON.stringify(roleData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to update role: ${response.status}`);
          }
        }

        const role = await response.json();
        return {
          id: role.id.toString(),
          name: role.name,
          isCustom: role.is_custom,
          permissions: role.permissions.map((rp: any) => ({
            id: rp.id,
            role_id: rp.role_id,
            permission_id: rp.permission_id,
            permission: {
              id: rp.permission.id,
              name: rp.permission.name,
              description: rp.permission.description
            }
          }))
        };
      } catch (error) {
        console.error(`Error updating role ${id}:`, error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const index = mockRoles.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Role not found');

      mockRoles[index] = {
        ...mockRoles[index],
        name: roleData.name,
        isCustom: roleData.is_custom !== undefined ? roleData.is_custom : mockRoles[index].isCustom
      };
      return mockRoles[index];
    }
  },

  async deleteRole(id: string): Promise<void> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to delete role: ${response.status}`);
          }
        }
      } catch (error) {
        console.error(`Error deleting role ${id}:`, error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const index = mockRoles.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Role not found');
      mockRoles.splice(index, 1);
    }
  },

  async getPermissions(): Promise<Permission[]> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/permissions`, {
          headers: createAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch permissions: ${response.status}`);
        }

        const permissions = await response.json();
        return permissions.map((permission: any) => ({
          id: permission.id.toString(),
          name: permission.name,
          description: permission.description
        }));
      } catch (error) {
        console.error('Error fetching permissions from backend:', error);
        // Fallback to mock permissions
        return mockPermissions;
      }
    } else {
      // If not in Docker, use mock permissions
      return mockPermissions;
    }
  },

  async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        const response = await fetch(`${API_BASE_URL}/role-permissions`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({
            role_id: parseInt(roleId),
            permission_id: parseInt(permissionId)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to add permission to role: ${response.status}`);
          }
        }
      } catch (error) {
        console.error(`Error adding permission ${permissionId} to role ${roleId}:`, error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const role = mockRoles.find(r => r.id === roleId);
      if (!role) throw new Error('Role not found');

      const permission = mockPermissions.find(p => p.id === permissionId);
      if (!permission) throw new Error('Permission not found');

      // Check if the role already has this permission
      const hasPermission = role.permissions.some(p => p.id === permissionId);
      if (!hasPermission) {
        role.permissions.push(permission);
      }
    }
  },

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await delay(500);

    if (isRunningInDocker()) {
      try {
        // First, we need to get the role permission ID
        const role = await this.getRole(roleId);
        const rolePermission = role.permissions.find(p => String(p.permission.id) === permissionId);
        if (!rolePermission) throw new Error('Permission not found in role');

        const response = await fetch(`${API_BASE_URL}/role-permissions/${rolePermission.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData && errorData.detail) {
            throw new Error(errorData.detail);
          } else {
            throw new Error(`Failed to remove permission from role: ${response.status}`);
          }
        }
      } catch (error) {
        console.error(`Error removing permission ${permissionId} from role ${roleId}:`, error);
        throw error;
      }
    } else {
      // In development mode, use mock data
      const role = mockRoles.find(r => r.id === roleId);
      if (!role) throw new Error('Role not found');

      // Remove the permission from the role
      role.permissions = role.permissions.filter(p => p.id !== permissionId);
    }
  },

  // Score calculation
  calculateRawScore(evaluations: KPIEvaluation[] | { rating: number; weightage: number }[]): number {
    if (evaluations.length === 0) return 0;
    // Calculate raw score as sum of (rating × weightage in decimal)
    return evaluations.reduce((sum, e) => sum + (e.rating * (e.weightage / 100)), 0);
  },

  calculateNormalizedScore(rawScore: number): number {
    // Normalize score using the formula: ((rawScore - 1.00) / 4.00) * 4.00 + 1.00
    return ((rawScore - 1.00) / 4.00) * 4.00 + 1.00;
  },

  getPerformanceLabel(normalizedScore: number): string {
    // Return performance label based on normalized score
    if (normalizedScore >= 4.50) return "Outstanding";
    if (normalizedScore >= 4.00) return "Exceeds Expectations";
    if (normalizedScore >= 3.50) return "Meets Expectations";
    return "Below Expectations";
  },

  calculateIncrementPercentage(normalizedScore: number): number {
    if (normalizedScore >= 4.50) return 22.5; // 20-25%
    if (normalizedScore >= 4.00) return 17.5; // 15-19.99%
    if (normalizedScore >= 3.50) return 12.5; // 10-14.99%
    if (normalizedScore >= 3.00) return 7.5;  // 5-9.99%
    return 2.5; // 0-4.99%
  },

  async getEvaluation(evaluationId: string): Promise<Evaluation> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${evaluationId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch evaluation');
    return await response.json();
  },
};
