# KPI Employee-Specific Creation Fix

## Issue Description

The tests were failing when creating employee-specific KPIs. The issue was identified in the `kpi_creation_test.cjs` file, where the property names used in the test script did not match the property names expected by the frontend form.

## Root Cause

The root cause of the issue was a property name mismatch between the test script and the frontend form:

1. The test script was using snake_case property names (`target_employee_id`, `target_role_id`, `is_technical`), while the frontend form was expecting camelCase property names (`targetEmployeeId`, `targetRoleId`, `isTechnical`).

2. This mismatch caused the test to fail when trying to select form fields for employee-specific KPIs, as it was looking for selectors like `select[name="target_employee_id"]` which didn't exist in the frontend form.

## Changes Made

The following changes were made to fix the issue:

1. Updated the selectors in the `createKPI` function to use camelCase:
   - Changed `select[name="target_role_id"]` to `select[name="targetRoleId"]`
   - Changed `select[name="target_employee_id"]` to `select[name="targetEmployeeId"]`
   - Changed `select[name="is_technical"]` to `select[name="isTechnical"]`

2. Updated the property names in the test data objects to use camelCase:
   - Changed `is_technical` to `isTechnical` in the `TEST_KPIS` object

3. Updated the references to these properties in the test functions:
   - Changed `target_role_id` to `targetRoleId` in the `testAdminKPICreation` function
   - Changed `target_employee_id` to `targetEmployeeId` in the `testAdminKPICreation` function
   - Changed `target_role_id` to `targetRoleId` in the `testManagerKPICreation` function
   - Changed `target_employee_id` to `targetEmployeeId` in the `testManagerKPICreation` function

## Verification

After making these changes, the test script should be able to correctly select and fill the form fields for employee-specific KPIs. The property names now match between the test script and the frontend form, ensuring that the test can interact with the form correctly.

## Lessons Learned

1. When writing tests for frontend forms, ensure that the property names in the test script match the property names in the frontend form.

2. Be consistent with naming conventions across the codebase. In this case, the backend was using snake_case (`target_employee_id`) while the frontend was using camelCase (`targetEmployeeId`), which led to confusion and errors.

3. When tests are failing, check for property name mismatches between the test script and the code being tested.

## Related Files

- `browser_tests/kpi_creation_test.cjs` - The test script that was fixed
- `browser_tests/kpi_e2e_test_updated.cjs` - A reference test script that was using the correct property names
- `backend/services/kpi.py` - The backend service that handles KPI creation
- `backend/schemas/kpi.py` - The schema that defines the KPI data structure
- `backend/models/kpi.py` - The database model for KPIs