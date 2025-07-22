# KPI Creation Test Coverage Documentation

## Overview

This document provides a comprehensive explanation of the test scenarios covered in the KPI creation test script (`browser_tests/kpi_creation_test.cjs`). The test script is designed to validate the KPI creation functionality across different user roles (Admin, Manager, Employee) and various KPI types (global, role-based, employee-specific).

## Test Configuration

The test uses the following configuration:

- **Base URL**: http://192.168.20.63
- **User Credentials**:
  - Admin: `sgul@trafix.com` / `Asdf@12345`
  - Manager: `m1@test.com` / `123`
  - Employee: `d@test.com` / `123`
  - Employee 2: `z@test.com` / `123`

## Test Scenarios

### 1. Admin KPI Creation Tests

#### 1.1 Admin Creating Global KPI

**Description**: Tests the ability of an Admin user to create a global KPI that applies to all employees.

**Steps**:
1. Login as Admin
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with global KPI data:
   - Title: "Global KPI Test"
   - Description: "This is a test global KPI created by automated test"
   - Weightage: 10
   - Type: "global"
   - Technical: Yes
5. Submit the form
6. Verify successful creation

**Expected Result**: Admin should be able to create a global KPI successfully.

**Rationale**: Admins have the highest level of permissions and should be able to create global KPIs that apply to all employees. This test verifies this core functionality.

#### 1.2 Admin Creating Role-based KPI

**Description**: Tests the ability of an Admin user to create a role-based KPI that applies to employees with a specific role.

**Steps**:
1. Login as Admin
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with role-based KPI data:
   - Title: "Role-based KPI Test"
   - Description: "This is a test role-based KPI created by automated test"
   - Weightage: 15
   - Type: "role-based"
   - Target Role: Employee role
   - Technical: Yes
5. Submit the form
6. Verify successful creation

**Expected Result**: Admin should be able to create a role-based KPI successfully.

**Rationale**: Admins should be able to create role-based KPIs to set performance metrics for specific roles. This test verifies that the role-based KPI creation works correctly for Admin users.

#### 1.3 Admin Creating Employee-specific KPI

**Description**: Tests the ability of an Admin user to create an employee-specific KPI that applies to a specific employee.

**Steps**:
1. Login as Admin
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with employee-specific KPI data:
   - Title: "Employee-specific KPI Test"
   - Description: "This is a test employee-specific KPI created by automated test"
   - Weightage: 20
   - Type: "employee-specific"
   - Target Employee: First employee in the list
   - Technical: No
5. Submit the form
6. Verify successful creation

**Expected Result**: Admin should be able to create an employee-specific KPI successfully.

**Rationale**: Admins should be able to create employee-specific KPIs to set individual performance metrics. This test verifies that the employee-specific KPI creation works correctly for Admin users.

### 2. Manager KPI Creation Tests

#### 2.1 Manager Creating Global KPI

**Description**: Tests the ability of a Manager user to create a global KPI that applies to all employees they manage.

**Steps**:
1. Login as Manager
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with global KPI data:
   - Title: "Manager Global KPI Test"
   - Description: "This is a test global KPI created by automated test"
   - Weightage: 10
   - Type: "global"
   - Technical: Yes
5. Submit the form
6. Verify successful creation

**Expected Result**: Manager should be able to create a global KPI successfully, but it will only apply to employees they manage.

**Rationale**: Managers should be able to create global KPIs that apply to all employees they manage. This test verifies that the global KPI creation works correctly for Manager users, with the appropriate scope limitation.

#### 2.2 Manager Creating Role-based KPI

**Description**: Tests the ability of a Manager user to create a role-based KPI that applies to employees with a specific role that they manage.

**Steps**:
1. Login as Manager
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with role-based KPI data:
   - Title: "Manager Role-based KPI Test"
   - Description: "This is a test role-based KPI created by automated test"
   - Weightage: 15
   - Type: "role-based"
   - Target Role: Employee role
   - Technical: Yes
5. Submit the form
6. Verify successful creation

**Expected Result**: Manager should be able to create a role-based KPI successfully, but it will only apply to employees with the specified role that they manage.

**Rationale**: Managers should be able to create role-based KPIs for roles within their team. This test verifies that the role-based KPI creation works correctly for Manager users, with the appropriate scope limitation.

#### 2.3 Manager Creating Employee-specific KPI

**Description**: Tests the ability of a Manager user to create an employee-specific KPI that applies to a specific employee they manage.

**Steps**:
1. Login as Manager
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with employee-specific KPI data:
   - Title: "Manager Employee-specific KPI Test"
   - Description: "This is a test employee-specific KPI created by automated test"
   - Weightage: 20
   - Type: "employee-specific"
   - Target Employee: First employee in the list
   - Technical: No
5. Submit the form
6. Verify successful creation

**Expected Result**: Manager should be able to create an employee-specific KPI successfully, but only for employees they manage.

**Rationale**: Managers should be able to create employee-specific KPIs for individual employees they manage. This test verifies that the employee-specific KPI creation works correctly for Manager users, with the appropriate scope limitation.

### 3. Employee KPI Creation Tests

**Description**: Tests that an Employee user cannot create KPIs.

**Steps**:
1. Login as Employee
2. Attempt to navigate to KPI management page
3. Check if "Create KPI" button exists
4. If button exists, attempt to create a KPI (should fail)

**Expected Result**: Employee should not be able to access the KPI creation functionality. Either:
- The KPI management page is not accessible
- The "Create KPI" button is not visible
- The KPI creation attempt fails with an authorization error

**Rationale**: Regular employees should not have permission to create KPIs. This test verifies that the permission restrictions are working correctly and employees cannot create KPIs.

### 4. Validation Scenario Tests

#### 4.1 Excessive Weightage Validation

**Description**: Tests that the system prevents creating a KPI with weightage exceeding 100%.

**Steps**:
1. Login as Admin
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with excessive weightage:
   - Title: "Excessive Weightage KPI Test"
   - Description: "This is a test global KPI created by automated test"
   - Weightage: 101 (exceeding 100%)
   - Type: "global"
   - Technical: Yes
5. Submit the form
6. Verify that creation fails with appropriate error message

**Expected Result**: The system should prevent the creation of a KPI with weightage exceeding 100% and display an appropriate error message.

**Rationale**: The total KPI weightage for an employee cannot exceed 100%. This test verifies that the validation rule is enforced correctly.

#### 4.2 Invalid Type Validation

**Description**: Tests that the system prevents creating a KPI with an invalid type.

**Steps**:
1. Login as Admin
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with invalid type:
   - Title: "Invalid Type KPI Test"
   - Description: "This is a test global KPI created by automated test"
   - Weightage: 10
   - Type: "" (empty type)
   - Technical: Yes
5. Submit the form
6. Verify that creation fails with appropriate error message

**Expected Result**: The system should prevent the creation of a KPI with an invalid type and display an appropriate error message.

**Rationale**: The KPI type must be one of the allowed values (global, role-based, employee-specific). This test verifies that the validation rule is enforced correctly.

#### 4.3 Missing Target Role Validation

**Description**: Tests that the system prevents creating a role-based KPI without specifying a target role.

**Steps**:
1. Login as Admin
2. Navigate to KPI management page
3. Click "Create KPI" button
4. Fill in KPI form with missing target role:
   - Title: "Missing Target Role KPI Test"
   - Description: "This is a test role-based KPI created by automated test"
   - Weightage: 15
   - Type: "role-based"
   - Target Role: null (not specified)
   - Technical: Yes
5. Submit the form
6. Verify that creation fails with appropriate error message

**Expected Result**: The system should prevent the creation of a role-based KPI without a target role and display an appropriate error message.

**Rationale**: Role-based KPIs require a target role to be specified. This test verifies that the validation rule is enforced correctly.

## Coverage Summary

The test script provides comprehensive coverage of KPI creation functionality:

### User Role Coverage
- **Admin**: Tests all KPI creation scenarios for Admin users
- **Manager**: Tests all KPI creation scenarios for Manager users
- **Employee**: Tests that employees cannot create KPIs

### KPI Type Coverage
- **Global KPIs**: Tests creation of global KPIs by Admin and Manager
- **Role-based KPIs**: Tests creation of role-based KPIs by Admin and Manager
- **Employee-specific KPIs**: Tests creation of employee-specific KPIs by Admin and Manager

### Validation Coverage
- **Weightage Validation**: Tests that KPIs with excessive weightage (>100%) are rejected
- **Type Validation**: Tests that KPIs with invalid types are rejected
- **Target Role Validation**: Tests that role-based KPIs without a target role are rejected

### Edge Cases
- **Permission Boundaries**: Tests that employees cannot create KPIs
- **Data Validation**: Tests various validation rules for KPI creation

## Conclusion

The KPI creation test script provides thorough coverage of all possible scenarios for KPI creation across different user roles and KPI types. It also tests important validation rules and edge cases to ensure the system behaves correctly under various conditions.

The test results are captured in detailed reports and screenshots, allowing for easy verification and troubleshooting of any issues that may arise during testing.