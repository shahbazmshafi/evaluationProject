# Role-Based Access Control for Evaluation Data

## Overview

This document outlines the role-based access control (RBAC) system implemented for evaluation data in the Employee Evaluation Portal. The system ensures that sensitive information, such as increment percentages and admin comments, is only visible to users with appropriate permissions.

## Permission Types

The following permission types have been added to control access to sensitive evaluation data:

- `EVALUATION_VIEW_INCREMENT`: Controls access to view increment percentages
- `EVALUATION_VIEW_ADMIN_COMMENTS`: Controls access to view admin comments

These permissions are in addition to existing permissions like `EVALUATION_READ`, `EVALUATION_WRITE`, and `EVALUATION_APPROVE`.

## Role-Based Access

Access to sensitive evaluation data is determined by the user's role:

1. **Admin Users**:
   - Can view all evaluation data, including increment percentages and admin comments
   - Can edit all evaluations
   - Can approve evaluations

2. **Manager Users**:
   - Cannot view increment percentages by default
   - Cannot view admin comments by default
   - Can edit evaluations they created or for employees they manage

3. **Employee Users**:
   - Cannot view increment percentages
   - Cannot view admin comments
   - Can only view non-sensitive evaluation data

## Implementation Details

### Backend

1. **Permission Object**:
   - Each evaluation response includes a `permissions` object with the following properties:
     - `can_view_increment_percentage`: Boolean indicating if the user can view the increment percentage
     - `can_view_admin_comments`: Boolean indicating if the user can view admin comments
     - `can_edit`: Boolean indicating if the user can edit the evaluation
     - `can_approve`: Boolean indicating if the user can approve the evaluation

2. **Permission Calculation**:
   - Permissions are calculated based on the user's role and relationship to the evaluation
   - Admin users are granted all permissions
   - Manager users are granted edit permissions for evaluations they created or for employees they manage

### Frontend

1. **Conditional Rendering**:
   - Sensitive data is only rendered if the user has the appropriate permissions
   - Increment percentages are hidden or shown as "Restricted" for users without permission
   - Admin comments are only visible to users with permission to view them

2. **Permission Utilities**:
   - The application uses utility functions to check permissions:
     - `hasPermission(user, permissionName)`
     - `hasAnyPermission(user, permissionNames)`
     - `hasAllPermissions(user, permissionNames)`

## Security Considerations

1. **Data Filtering**:
   - Permissions are enforced at the API response level
   - Even if the frontend is compromised, sensitive data is filtered before being sent to unauthorized users

2. **Permission Inheritance**:
   - Permissions are not inherited between roles
   - Each permission must be explicitly granted to a role

## Testing

To test the RBAC system:

1. Log in as an Admin user and verify all data is visible
2. Log in as a Manager user and verify increment percentages and admin comments are hidden
3. Log in as an Employee user and verify only appropriate data is visible