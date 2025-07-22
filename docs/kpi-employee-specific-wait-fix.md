# KPI Employee-Specific Creation Wait Fix

## Issue Description

The KPI creation Playwright test was failing when creating employee-specific KPIs. The issue occurred because when selecting "employee-specific" from the KPI type dropdown, there was a delay before the "Target Employee" dropdown became available. The test script was attempting to interact with the "Target Employee" dropdown immediately after selecting "employee-specific", causing the test to fail.

## Root Cause

The root cause of the issue was a timing problem:

1. When "employee-specific" is selected from the KPI type dropdown, the frontend application needs time to update the form and render the "Target Employee" dropdown.

2. This rendering delay was not accounted for in the test script, causing it to attempt to interact with the "Target Employee" dropdown before it was fully available.

3. As a result, the test would fail when trying to select an employee from the dropdown.

## Changes Made

The following changes were made to fix the issue:

1. Added a 3-second wait after selecting "employee-specific" from the dropdown and before interacting with the "Target Employee" dropdown:

```javascript
if (kpiData.type === 'employee-specific' && kpiData.targetEmployeeId) {
  // Wait for 3 seconds after selecting employee-specific type before interacting with Target Employee dropdown
  console.log('Waiting 3 seconds for Target Employee dropdown to become available...');
  await page.waitForTimeout(3000);
  
  await page.selectOption('select[name="targetEmployeeId"]', kpiData.targetEmployeeId.toString(), { timeout: FORM_TIMEOUT });
}
```

2. Added a console log message to indicate that the script is waiting for the Target Employee dropdown to become available, which helps with debugging.

## Verification

After making these changes, the test script should be able to correctly:
1. Select "employee-specific" from the KPI type dropdown
2. Wait for 3 seconds to allow the frontend to update and render the "Target Employee" dropdown
3. Successfully interact with the "Target Employee" dropdown and select an employee

This ensures that the test can properly create employee-specific KPIs without timing-related failures.

## Lessons Learned

1. When writing tests for dynamic forms where elements appear or change based on user selections, it's important to account for rendering delays.

2. Using explicit waits (like `waitForTimeout`) can be necessary when the application has known delays that aren't tied to specific DOM events.

3. While it's generally better to wait for specific elements or conditions rather than using fixed timeouts, in some cases a fixed timeout is the most practical solution, especially when dealing with rendering delays that don't have clear DOM indicators.

## Related Files

- `browser_tests/kpi_creation_test.cjs` - The test script that was fixed