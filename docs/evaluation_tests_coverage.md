# Evaluation Tests Coverage Documentation

## Overview

This document provides a comprehensive explanation of the test scenarios covered in the evaluation test scripts:
- `browser_tests/evaluation_cycle_creation_test.cjs`: Tests for creating evaluation cycles
- `browser_tests/perform_evaluation_test.cjs`: Tests for performing evaluations

The test scripts are designed to validate the evaluation functionality across different user roles (Admin, Manager, Employee) and various scenarios.

## Test Configuration

The tests use the following configuration:

- **Base URL**: http://192.168.20.63
- **User Credentials**:
  - Admin: `sgul@trafix.com` / `Asdf@12345`
  - Manager: `m1@test.com` / `123`
  - Employee: `d@test.com` / `123`

## Test Scenarios

### 1. Evaluation Cycle Creation Tests

#### 1.1 Admin Creating Evaluation Cycles

**Description**: Tests the ability of an Admin user to create evaluation cycles with different time periods.

**Scenarios**:

##### 1.1.1 Admin Creating Standard Evaluation Cycle

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with standard period data:
   - Name: "Q3 2025 Performance Review"
   - Evaluation Start Date: "2025-07-01"
   - Evaluation End Date: "2025-09-30"
   - Execution Start Date: "2025-10-01"
   - Execution End Date: "2025-10-15"
5. Submit the form
6. Verify successful creation

**Expected Result**: Admin should be able to create a standard evaluation cycle successfully.

**Rationale**: Admins have the highest level of permissions and should be able to create evaluation cycles. This test verifies this core functionality with a typical quarterly evaluation cycle.

##### 1.1.2 Admin Creating Short Period Evaluation Cycle

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with short period data:
   - Name: "August 2025 Quick Review"
   - Evaluation Start Date: "2025-08-01"
   - Evaluation End Date: "2025-08-31"
   - Execution Start Date: "2025-09-01"
   - Execution End Date: "2025-09-07"
5. Submit the form
6. Verify successful creation

**Expected Result**: Admin should be able to create a short period evaluation cycle successfully.

**Rationale**: The system should support evaluation cycles of varying durations, including short periods like monthly reviews. This test verifies that short evaluation cycles can be created.

##### 1.1.3 Admin Creating Long Period Evaluation Cycle

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with long period data:
   - Name: "H2 2025 Comprehensive Review"
   - Evaluation Start Date: "2025-07-01"
   - Evaluation End Date: "2025-12-31"
   - Execution Start Date: "2026-01-01"
   - Execution End Date: "2026-01-31"
5. Submit the form
6. Verify successful creation

**Expected Result**: Admin should be able to create a long period evaluation cycle successfully.

**Rationale**: The system should support evaluation cycles of varying durations, including long periods like semi-annual or annual reviews. This test verifies that long evaluation cycles can be created.

#### 1.2 Manager Creating Evaluation Cycles

**Description**: Tests the ability of a Manager user to create evaluation cycles.

**Scenarios**:

##### 1.2.1 Manager Creating Standard Evaluation Cycle

**Steps**:
1. Login as Manager
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with standard period data:
   - Name: "Manager Standard Cycle Test"
   - Evaluation Start Date: "2025-07-01"
   - Evaluation End Date: "2025-09-30"
   - Execution Start Date: "2025-10-01"
   - Execution End Date: "2025-10-15"
5. Submit the form
6. Verify successful creation

**Expected Result**: Manager should be able to create a standard evaluation cycle successfully, but it may only apply to employees they manage.

**Rationale**: Managers should be able to create evaluation cycles for their team members. This test verifies that managers can create standard evaluation cycles.

##### 1.2.2 Manager Creating Short Period Evaluation Cycle

**Steps**:
1. Login as Manager
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with short period data:
   - Name: "Manager Short Period Cycle Test"
   - Evaluation Start Date: "2025-08-01"
   - Evaluation End Date: "2025-08-31"
   - Execution Start Date: "2025-09-01"
   - Execution End Date: "2025-09-07"
5. Submit the form
6. Verify successful creation

**Expected Result**: Manager should be able to create a short period evaluation cycle successfully, but it may only apply to employees they manage.

**Rationale**: Managers should be able to create evaluation cycles of varying durations for their team members. This test verifies that managers can create short evaluation cycles.

#### 1.3 Employee Evaluation Cycle Creation Tests

**Description**: Tests that an Employee user cannot create evaluation cycles.

**Steps**:
1. Login as Employee
2. Attempt to navigate to Evaluations page
3. Check if "Create Evaluation Cycle" button exists
4. If button exists, attempt to create an evaluation cycle (should fail)

**Expected Result**: Employee should not be able to access the evaluation cycle creation functionality. Either:
- The "Create Evaluation Cycle" button is not visible
- The evaluation cycle creation attempt fails with an authorization error

**Rationale**: Regular employees should not have permission to create evaluation cycles. This test verifies that the permission restrictions are working correctly and employees cannot create evaluation cycles.

#### 1.4 Validation Scenario Tests

**Description**: Tests validation rules for evaluation cycle creation.

**Scenarios**:

##### 1.4.1 Missing Name Validation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with missing name:
   - Name: "" (empty)
   - Evaluation Start Date: "2025-07-01"
   - Evaluation End Date: "2025-09-30"
   - Execution Start Date: "2025-10-01"
   - Execution End Date: "2025-10-15"
5. Submit the form
6. Verify that creation fails with appropriate error message

**Expected Result**: The system should prevent the creation of an evaluation cycle without a name and display an appropriate error message.

**Rationale**: Evaluation cycles must have a name for identification. This test verifies that the validation rule is enforced correctly.

##### 1.4.2 Invalid Dates Validation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with invalid dates (end date before start date):
   - Name: "Invalid Dates Cycle Test"
   - Evaluation Start Date: "2025-09-30"
   - Evaluation End Date: "2025-07-01"
   - Execution Start Date: "2025-10-01"
   - Execution End Date: "2025-10-15"
5. Submit the form
6. Verify that creation fails with appropriate error message

**Expected Result**: The system should prevent the creation of an evaluation cycle with invalid dates and display an appropriate error message.

**Rationale**: Evaluation cycles must have valid date ranges (end date after start date). This test verifies that the validation rule is enforced correctly.

##### 1.4.3 Invalid Period Validation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Create Evaluation Cycle" button
4. Fill in evaluation cycle form with execution period before evaluation period:
   - Name: "Invalid Period Cycle Test"
   - Evaluation Start Date: "2025-09-01"
   - Evaluation End Date: "2025-09-30"
   - Execution Start Date: "2025-08-01"
   - Execution End Date: "2025-08-15"
5. Submit the form
6. Verify that creation fails with appropriate error message

**Expected Result**: The system should prevent the creation of an evaluation cycle with execution period before evaluation period and display an appropriate error message.

**Rationale**: Execution period should logically follow the evaluation period. This test verifies that the validation rule is enforced correctly.

### 2. Perform Evaluation Tests

#### 2.1 Admin Performing Evaluations

**Description**: Tests the ability of an Admin user to perform evaluations.

**Scenarios**:

##### 2.1.1 Admin Starting an Evaluation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Click "Start" button for an employee
4. Verify that evaluation form opens

**Expected Result**: Admin should be able to start an evaluation for any employee.

**Rationale**: Admins should be able to initiate evaluations for any employee in the system. This test verifies this core functionality.

##### 2.1.2 Admin Filling Evaluation Form

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Start an evaluation
4. Fill in ratings and comments for each KPI
5. Fill in overall comments
6. Fill in admin-specific comments
7. Verify that all fields are filled correctly

**Expected Result**: Admin should be able to fill in all evaluation form fields, including admin-specific sections.

**Rationale**: Admins should be able to provide comprehensive feedback in evaluations, including in admin-specific sections. This test verifies that all form fields can be filled correctly.

##### 2.1.3 Admin Saving Evaluation as Draft

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Start an evaluation
4. Fill in evaluation form
5. Click "Save Draft" button
6. Verify that evaluation is saved as draft

**Expected Result**: Admin should be able to save an evaluation as draft for later completion.

**Rationale**: The system should allow saving evaluations as drafts to support multi-session evaluation completion. This test verifies this functionality.

##### 2.1.4 Admin Submitting Evaluation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Start an evaluation
4. Fill in evaluation form
5. Click "Submit Evaluation" button
6. Verify that evaluation is submitted successfully

**Expected Result**: Admin should be able to submit a completed evaluation.

**Rationale**: Admins should be able to submit finalized evaluations. This test verifies this core functionality.

#### 2.2 Manager Performing Evaluations

**Description**: Tests the ability of a Manager user to perform evaluations.

**Scenarios**:

##### 2.2.1 Manager Starting an Evaluation

**Steps**:
1. Login as Manager
2. Navigate to Evaluations page
3. Click "Start" button for an employee they manage
4. Verify that evaluation form opens

**Expected Result**: Manager should be able to start an evaluation for employees they manage.

**Rationale**: Managers should be able to initiate evaluations for their team members. This test verifies this core functionality.

##### 2.2.2 Manager Filling Evaluation Form

**Steps**:
1. Login as Manager
2. Navigate to Evaluations page
3. Start an evaluation
4. Fill in ratings and comments for each KPI
5. Fill in overall comments
6. Fill in manager-specific comments
7. Verify that all fields are filled correctly

**Expected Result**: Manager should be able to fill in all evaluation form fields, including manager-specific sections.

**Rationale**: Managers should be able to provide comprehensive feedback in evaluations, including in manager-specific sections. This test verifies that all form fields can be filled correctly.

##### 2.2.3 Manager Saving Evaluation as Draft

**Steps**:
1. Login as Manager
2. Navigate to Evaluations page
3. Start an evaluation
4. Fill in evaluation form
5. Click "Save Draft" button
6. Verify that evaluation is saved as draft

**Expected Result**: Manager should be able to save an evaluation as draft for later completion.

**Rationale**: The system should allow saving evaluations as drafts to support multi-session evaluation completion. This test verifies this functionality.

##### 2.2.4 Manager Submitting Evaluation

**Steps**:
1. Login as Manager
2. Navigate to Evaluations page
3. Start an evaluation
4. Fill in evaluation form
5. Click "Submit Evaluation" button
6. Verify that evaluation is submitted successfully

**Expected Result**: Manager should be able to submit a completed evaluation.

**Rationale**: Managers should be able to submit finalized evaluations. This test verifies this core functionality.

#### 2.3 Employee Evaluation Tests

**Description**: Tests that an Employee user cannot perform evaluations for others (or can only perform self-evaluations).

**Steps**:
1. Login as Employee
2. Navigate to Evaluations page
3. Check if "Start" buttons exist
4. If buttons exist, attempt to start an evaluation
5. Verify that either:
   - No "Start" buttons are available
   - The evaluation start attempt fails
   - Only self-evaluation is allowed

**Expected Result**: Employee should not be able to perform evaluations for others. Either:
- No "Start" buttons are visible
- The evaluation start attempt fails with an authorization error
- Only self-evaluation is allowed

**Rationale**: Regular employees should not have permission to evaluate others. This test verifies that the permission restrictions are working correctly and employees cannot perform evaluations for others.

#### 2.4 Validation Scenario Tests

**Description**: Tests validation rules for performing evaluations.

**Scenarios**:

##### 2.4.1 Empty Ratings Validation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Start an evaluation
4. Without filling any ratings, click "Submit Evaluation" button
5. Verify that submission fails or shows a confirmation dialog

**Expected Result**: The system should prevent or warn about submitting an evaluation with empty ratings.

**Rationale**: Evaluations should have ratings for all KPIs. This test verifies that the validation rule is enforced correctly.

##### 2.4.2 Invalid Ratings Validation

**Steps**:
1. Login as Admin
2. Navigate to Evaluations page
3. Start an evaluation
4. Try to enter an invalid rating (e.g., above 5.0)
5. Verify that the invalid rating is rejected or normalized

**Expected Result**: The system should prevent entering invalid ratings outside the allowed range (0.0-5.0).

**Rationale**: Ratings must be within the valid range. This test verifies that the validation rule is enforced correctly.

## Coverage Summary

The test scripts provide comprehensive coverage of evaluation functionality:

### User Role Coverage
- **Admin**: Tests all evaluation cycle creation and evaluation performance scenarios for Admin users
- **Manager**: Tests all evaluation cycle creation and evaluation performance scenarios for Manager users
- **Employee**: Tests that employees cannot create evaluation cycles or perform evaluations for others

### Evaluation Cycle Coverage
- **Standard Cycles**: Tests creation of standard quarterly evaluation cycles
- **Short Cycles**: Tests creation of short monthly evaluation cycles
- **Long Cycles**: Tests creation of long semi-annual evaluation cycles

### Evaluation Performance Coverage
- **Starting Evaluations**: Tests starting evaluations for different employees
- **Filling Evaluations**: Tests filling in ratings, comments, and role-specific sections
- **Saving Drafts**: Tests saving evaluations as drafts for later completion
- **Submitting Evaluations**: Tests submitting completed evaluations

### Validation Coverage
- **Evaluation Cycle Validation**: Tests validation for missing name, invalid dates, and invalid periods
- **Evaluation Performance Validation**: Tests validation for empty ratings and invalid rating values

### Edge Cases
- **Permission Boundaries**: Tests that employees cannot create evaluation cycles or perform evaluations for others
- **Data Validation**: Tests various validation rules for evaluation cycle creation and evaluation performance

## Conclusion

The evaluation test scripts provide thorough coverage of all possible scenarios for evaluation cycle creation and evaluation performance across different user roles. They also test important validation rules and edge cases to ensure the system behaves correctly under various conditions.

The test results are captured in detailed reports and screenshots, allowing for easy verification and troubleshooting of any issues that may arise during testing.