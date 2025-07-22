# Testing Instructions for KPI Creation Test Fix

## Overview

The KPI creation test script has been modified to add a 3-second wait after selecting "employee-specific" from the KPI type dropdown and before interacting with the "Target Employee" dropdown. This change should fix the issue where the test was failing when creating employee-specific KPIs.

## How to Test the Changes

1. Navigate to the project directory:
   ```
   cd D:\AiProjects\project-bolt\project
   ```

2. Run the KPI creation test script:
   ```
   npx playwright test browser_tests/kpi_creation_test.cjs
   ```

3. Observe the test execution, particularly when it creates employee-specific KPIs:
   - You should see the console message "Waiting 3 seconds for Target Employee dropdown to become available..."
   - The script should wait for 3 seconds before attempting to select an employee from the dropdown
   - The employee-specific KPI creation should complete successfully

4. Verify that the test passes without any errors related to selecting the target employee.

## Expected Results

- The test should successfully create employee-specific KPIs without timing-related failures
- You should see the console message indicating the wait period
- The test should pass all employee-specific KPI creation scenarios for both Admin and Manager users

## Troubleshooting

If the test still fails:

1. Check if the wait time (3 seconds) is sufficient. If not, you may need to increase it.
2. Verify that the selectors for the Target Employee dropdown are correct (`select[name="targetEmployeeId"]`).
3. Check if there are any other dynamic elements in the form that might need similar wait times.
4. Examine the browser console for any JavaScript errors that might be affecting the form's behavior.

## Reporting Results

After testing, please report the results:
- Whether the test passed or failed
- Any error messages if it failed
- Any observations about the test execution
- Any suggestions for further improvements