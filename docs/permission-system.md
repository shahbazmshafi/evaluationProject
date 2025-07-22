# Role-Based Permission System Implementation

## Overview
This document describes the implementation of a role-based permission system for the EvalPortal application. The system allows for granular control of user access to different features of the application based on permissions assigned to roles.

## Database Changes
The following database changes were made to support the permission system:

1. Created a new `permissions` table with the following columns:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (VARCHAR(50) UNIQUE NOT NULL)
   - `description` (TEXT NOT NULL)

2. Added a `permissions` column to the `roles` table to store serialized permission data.

3. Created a `role_permissions` table for the many-to-many relationship between roles and permissions:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `role_id` (INTEGER NOT NULL, FOREIGN KEY)
   - `permission_id` (INTEGER NOT NULL, FOREIGN KEY)
   - Unique constraint on (role_id, permission_id)

## Core Permissions
The following core permissions were implemented:

1. User Management:
   - USER_READ: View users
   - USER_WRITE: Create/Edit users
   - USER_DELETE: Delete users

2. KPI Management:
   - KPI_READ: View KPIs
   - KPI_WRITE: Create/Edit KPIs
   - KPI_DELETE: Delete KPIs

3. Evaluation Management:
   - EVALUATION_READ: View evaluations
   - EVALUATION_WRITE: Create/Edit evaluations
   - EVALUATION_APPROVE: Approve evaluations

## Default Role Permissions
The default roles were assigned the following permissions:

1. Admin: All permissions
2. Manager: All permissions except DELETE permissions
3. Employee: Only READ permissions

## Backend Changes
The following backend changes were made:

1. Created a database update script (`update_db_permissions.py`) to add the necessary tables and columns.

2. Created a permission validation middleware (`permission_middleware.py`) with the following functions:
   - `has_permission`: Checks if a user has a specific permission
   - `has_any_permission`: Checks if a user has any of the specified permissions
   - `has_all_permissions`: Checks if a user has all of the specified permissions

## Frontend Changes
The following frontend changes were made:

1. Created a permissions utility file (`permissions.ts`) with the following functions:
   - `hasPermission`: Checks if a user has a specific permission
   - `hasAnyPermission`: Checks if a user has any of the specified permissions
   - `hasAllPermissions`: Checks if a user has all of the specified permissions
   - `getUserPermissions`: Gets all permissions of a user
   - `PERMISSIONS`: Constants for all available permissions

2. Updated the RoleManagementPage component to use permission-based access control.

3. Updated the Layout component to show navigation items based on user permissions:
   - Dashboard: Always visible
   - Evaluations: Visible to users with EVALUATION_READ permission
   - KPIs: Visible to users with KPI_READ permission
   - Users: Visible to users with USER_READ permission
   - Role Management: Visible to users with USER_WRITE permission
   - Settings: Always visible

4. Updated the UsersPage component to use permission-based access control:
   - User list: Users with USER_READ permission can see all users, others can only see their team members
   - Add User button: Only visible to users with USER_WRITE permission
   - Edit User button: Only visible to users with USER_WRITE permission
   - Delete User button: Only visible to users with USER_DELETE permission
   - Toggle User Status button: Only visible to users with USER_WRITE permission
   - Role filter: Only visible to users with USER_READ permission
   - Page title and description: Shows "User Management" for users with USER_READ permission, "Team" for others

## Testing
The implementation was tested to ensure that:
1. Users can only see navigation items they have permission to access
2. Users can only perform actions they have permission to perform
3. The default role permissions are correctly assigned

## Permission Persistence
The permission system is designed to maintain role permissions across container rebuilds and system restarts:

1. During system initialization:
   - The system checks if role-permission associations already exist in the database
   - If no associations exist (new installation), default permissions are assigned to built-in roles
   - If associations exist (existing installation), they are preserved to maintain custom configurations

2. For built-in roles (Admin, Manager, Employee):
   - Any modifications to their permissions are preserved across system restarts
   - New permissions added to the system are automatically assigned to the Admin role

3. For custom roles:
   - All custom roles and their permission assignments are preserved across system restarts
   - Custom roles can be created, modified, and deleted through the Role Management interface

## Future Enhancements
Potential future enhancements to the permission system:
1. Add more granular permissions for specific actions
2. Implement a permission audit log
3. Add the ability to create custom permissions
4. Add a permission history tracking system to record changes to role permissions
