# User Login Fix Documentation

## Issue Description
Users were facing an issue where they could see users on the `/users` page, but when trying to login with these users, they would get a "User not found. Please check your email address" error. This was happening specifically when accessing the application via a local IP address (Docker mode).

## Root Cause Analysis
After investigating the issue, we found that there was a disconnect between how users were being displayed and how they were being authenticated:

1. **Two Separate Databases**: The application uses two separate databases:
   - `employee_eval.db`: This is the main database that stores user information, including the password hash. The login endpoint checks this database to validate the user's credentials.
   - `localStorage_sync.db`: This database is used to store user data for the frontend. It contains a copy of the user information, including the password in plain text. This is used for offline access and for syncing data between the frontend and backend.

2. **User Creation Process**: When a user was created through the frontend in Docker mode:
   - The user was added to the `localStorage_sync.db` database via the `/sync/users` endpoint
   - The user was not added to the `employee_eval.db` database because the frontend was not making a direct API call to the backend's `create_user` endpoint

3. **User Display vs. Authentication**: The `/users` page was displaying users from the `localStorage_sync.db` database, but the login function was checking for users in the `employee_eval.db` database. This explains why users were visible on the `/users` page but couldn't login.

## Solution
To fix this issue, we modified the frontend's `createUser` function to make a direct API call to the backend's `create_user` endpoint when running in Docker mode. This ensures that users are properly created in both databases:

1. The backend's `create_user` endpoint creates the user in the `employee_eval.db` database
2. The backend's `create_user` endpoint also adds the user to the `localStorage_sync.db` database

### Implementation Details
We updated the `createUser` function in `src/services/api.ts` to use the backend API when running in Docker mode:

```typescript
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
    // ... (existing code for development mode) ...
  }
}
```

## Testing
To test this fix:
1. Create a new user through the frontend
2. Verify that the user appears on the `/users` page
3. Logout and attempt to login with the new user
4. Verify that the login is successful and the user can access the dashboard

## Conclusion
The issue was fixed by ensuring that users are properly created in both databases when using the application in Docker mode. This ensures consistency between the user listing and authentication processes.

## Additional Notes
- The application uses two separate databases for different purposes, which can lead to synchronization issues if not properly managed.
- The `localStorage_sync.db` database stores passwords in plain text, which is not secure. In a production environment, it would be better to use a more secure method for storing passwords.
- The frontend uses the `localStorage_sync.db` database for offline access, which is why it needs a copy of the user data.