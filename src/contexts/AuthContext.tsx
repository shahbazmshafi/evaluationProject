import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { apiService } from '../services/api';
import { isRunningInDocker } from '../utils/environment';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage keys
const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to get the stored token
  const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  };

  // Function to store the token
  const storeToken = (newToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
  };

  // Function to remove the token
  const removeToken = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // Check for stored token and user
    const checkStoredAuth = async () => {
      try {
        const storedToken = getStoredToken();

        if (storedToken) {
          setToken(storedToken);

          // Get user from localStorage
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }

          // If in Docker mode, validate the token with the backend
          if (isRunningInDocker()) {
            try {
              const response = await fetch('/api/auth/validate', {
                headers: {
                  'Authorization': `Bearer ${storedToken}`
                }
              });

              if (!response.ok) {
                // Token is invalid, clear it
                removeToken();
              } else {
                // Token is valid, get the user data
                const data = await response.json();
                if (data.user) {
                  // Transform the user data to match the frontend's expected structure
                  const transformedUser = {
                    ...data.user,
                    role: {
                      ...data.user.role,
                      isCustom: data.user.role.is_custom,
                      permissions: (data.user.role.permissions || []).map(p => ({
                        id: p.permission ? p.permission.id : p.id,
                        name: p.permission ? p.permission.name : p.name,
                        description: p.permission ? p.permission.description : p.description
                      }))
                    }
                  };

                  console.log('Token validation - transformed user permissions:', transformedUser.role.permissions);
                  setUser(transformedUser);
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(transformedUser));
                }
              }
            } catch (error) {
              console.error('Error validating token:', error);
              // On error, keep the token (offline mode)
            }
          }
        }
      } catch (error) {
        console.error('Error checking stored authentication:', error);
        removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      // Use the new login function from apiService
      const { token: newToken, user: userData } = await apiService.login(email, password);

      // Transform the user data to properly extract nested permissions
      const transformedUser = { 
        ...userData, 
        role: { 
          ...userData.role, 
          isCustom: userData.role.isCustom, 
          permissions: userData.role.permissions.map(p => ({ 
            id: p.permission ? p.permission.id : p.id, 
            name: p.permission ? p.permission.name : p.name, 
            description: p.permission ? p.permission.description : p.description 
          })) 
        } 
      };

      console.log('Transformed user permissions:', transformedUser.role.permissions);

      // Store the token and user
      storeToken(newToken);
      setUser(transformedUser);

      // Also store the user in localStorage for offline access
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(transformedUser));

      // If in Docker mode, store the user session on the backend
      if (isRunningInDocker()) {
        try {
          await fetch('/api/sync/current-user', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user: transformedUser }),
          });
        } catch (error) {
          console.error('Error storing user session on server:', error);
        }
      }

    } catch (error: any) {
      console.error('Login error:', error);

      // Extract error message from the response if available
      if (error.response && error.response.data && error.response.data.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw error; // Re-throw the error with its original message
      } else {
        throw new Error('Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear token and user
    removeToken();

    // If in Docker mode, notify the backend about logout
    if (isRunningInDocker() && token) {
      try {
        // Clear the user session on the backend
        await fetch('/api/sync/current-user', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user: null }),
        });

        // Also call the logout endpoint
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      } catch (error) {
        console.error('Error logging out on server:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
