const { chromium } = require('playwright');

// Configuration
const BASE_URL = 'http://192.168.20.63';
const ADMIN_USER = { username: 'sgul@trafix.com', password: 'Asdf@12345' };
const MANAGER_USER = { username: 'm1@test.com', password: '123' };

// Strict timeout - tests will fail if operations take longer than this
const STRICT_TIMEOUT = 7000; // 7 seconds

// Admin test scenarios
const adminScenarios = [
  {
    name: 'Admin Create Global KPI',
    action: 'create',
    kpi: {
      title: 'Admin Global KPI',
      description: 'A global KPI created by admin',
      weightage: 10,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Role-Based KPI',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based KPI',
      description: 'A role-based KPI created by admin',
      weightage: 10,
      type: 'role-based',
      targetRoleId: '3', // Employee role
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Employee-Specific KPI',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific KPI',
      description: 'An employee-specific KPI created by admin',
      weightage: 10,
      type: 'employee-specific',
      targetEmployeeId: '4', // employee1
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Update KPI',
    action: 'update',
    kpiSelector: 'Admin Global KPI',
    kpi: {
      title: 'Updated Admin Global KPI',
      description: 'An updated global KPI',
      weightage: 5,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Delete KPI',
    action: 'delete',
    kpiSelector: 'Admin Role-Based KPI'
  }
];

// Manager test scenarios
const managerScenarios = [
  {
    name: 'Manager Create Global KPI',
    action: 'create',
    kpi: {
      title: 'Manager Global KPI',
      description: 'A global KPI created by manager',
      weightage: 10,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Employee-Specific KPI',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific KPI',
      description: 'An employee-specific KPI created by manager',
      weightage: 15,
      type: 'employee-specific',
      targetEmployeeId: '4', // employee1
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Update KPI',
    action: 'update',
    kpiSelector: 'Manager Global KPI',
    kpi: {
      title: 'Updated Manager Global KPI',
      description: 'An updated global KPI',
      weightage: 12,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Delete KPI',
    action: 'delete',
    kpiSelector: 'Manager Global KPI'
  }
];

// Helper function to log in
async function login(page, username, password) {
  console.log(`Logging in as ${username}...`);

  try {
    await page.goto(`${BASE_URL}/login`, { timeout: STRICT_TIMEOUT });

    // Fill in login form - using exact selectors from the frontend code
    await page.fill('input[name="email"]', username, { timeout: STRICT_TIMEOUT });
    await page.fill('input[name="password"]', password, { timeout: STRICT_TIMEOUT });

    // Submit the form
    await page.click('button[type="submit"]', { timeout: STRICT_TIMEOUT });

    // Wait for navigation to complete
    await page.waitForNavigation({ timeout: STRICT_TIMEOUT }).catch(error => {
      throw new Error(`Login timed out after ${STRICT_TIMEOUT}ms: ${error.message}`);
    });

    console.log('Login successful');
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
}

// Helper function to create a KPI
async function createKPI(page, kpi) {
  console.log(`Creating KPI: ${kpi.title}...`);

  try {
    // Navigate to KPIs page
    await page.goto(`${BASE_URL}/kpis`, { timeout: STRICT_TIMEOUT });

    // Click the "Add KPI" button - using exact selector from the frontend code
    await page.click('button:has-text("Add KPI")', { timeout: STRICT_TIMEOUT });

    // Fill in the form - using exact selectors from the frontend code
    await page.fill('input[name="title"]', kpi.title, { timeout: STRICT_TIMEOUT });
    await page.fill('textarea[name="description"]', kpi.description, { timeout: STRICT_TIMEOUT });
    await page.fill('input[name="weightage"]', kpi.weightage.toString(), { timeout: STRICT_TIMEOUT });

    // Select KPI type (technical or administrative)
    await page.selectOption('select[name="isTechnical"]', kpi.isTechnical ? 'true' : 'false', { timeout: STRICT_TIMEOUT });

    // Select KPI scope
    await page.selectOption('select[name="type"]', kpi.type, { timeout: STRICT_TIMEOUT });

    // If role-based, select the target role
    if (kpi.type === 'role-based' && kpi.targetRoleId) {
      await page.waitForSelector('select[name="targetRoleId"]', { timeout: STRICT_TIMEOUT });
      await page.selectOption('select[name="targetRoleId"]', kpi.targetRoleId, { timeout: STRICT_TIMEOUT });
    }

    // If employee-specific, select the target employee
    if (kpi.type === 'employee-specific' && kpi.targetEmployeeId) {
      await page.waitForSelector('select[name="targetEmployeeId"]', { timeout: STRICT_TIMEOUT });
      await page.selectOption('select[name="targetEmployeeId"]', kpi.targetEmployeeId, { timeout: STRICT_TIMEOUT });
    }

    // Select status
    await page.selectOption('select[name="status"]', kpi.status, { timeout: STRICT_TIMEOUT });

    // Submit the form - using exact text from the button in the frontend code
    const submitButtonText = 'Create KPI';
    await page.click(`button:has-text("${submitButtonText}")`, { timeout: STRICT_TIMEOUT });

    // Wait for the form to close or success notification
    await Promise.race([
      page.waitForSelector('div:has-text("KPI created successfully")', { timeout: STRICT_TIMEOUT }),
      page.waitForFunction(() => !document.querySelector('form:has(input[name="title"])'), { timeout: STRICT_TIMEOUT })
    ]).catch(error => {
      throw new Error(`KPI creation timed out after ${STRICT_TIMEOUT}ms: ${error.message}`);
    });

    console.log(`KPI created: ${kpi.title}`);
  } catch (error) {
    console.error(`Error creating KPI ${kpi.title}:`, error);
    throw new Error(`Failed to create KPI ${kpi.title}: ${error.message}`);
  }
}

// Helper function to update a KPI
async function updateKPI(page, kpiSelector, kpi) {
  console.log(`Updating KPI: ${kpiSelector}...`);

  try {
    // Navigate to KPIs page
    await page.goto(`${BASE_URL}/kpis`, { timeout: STRICT_TIMEOUT });

    // Find the KPI by title and click the edit button
    const kpiRow = await page.waitForSelector(`tr:has-text("${kpiSelector}")`, { timeout: STRICT_TIMEOUT });
    await kpiRow.hover();
    await page.click(`tr:has-text("${kpiSelector}") >> button[aria-label="Edit KPI"]`, { timeout: STRICT_TIMEOUT });

    // Fill in the form - using exact selectors from the frontend code
    await page.fill('input[name="title"]', kpi.title, { timeout: STRICT_TIMEOUT });
    await page.fill('textarea[name="description"]', kpi.description, { timeout: STRICT_TIMEOUT });
    await page.fill('input[name="weightage"]', kpi.weightage.toString(), { timeout: STRICT_TIMEOUT });

    // Select KPI type (technical or administrative)
    await page.selectOption('select[name="isTechnical"]', kpi.isTechnical ? 'true' : 'false', { timeout: STRICT_TIMEOUT });

    // Select KPI scope
    await page.selectOption('select[name="type"]', kpi.type, { timeout: STRICT_TIMEOUT });

    // If role-based, select the target role
    if (kpi.type === 'role-based' && kpi.targetRoleId) {
      await page.waitForSelector('select[name="targetRoleId"]', { timeout: STRICT_TIMEOUT });
      await page.selectOption('select[name="targetRoleId"]', kpi.targetRoleId, { timeout: STRICT_TIMEOUT });
    }

    // If employee-specific, select the target employee
    if (kpi.type === 'employee-specific' && kpi.targetEmployeeId) {
      await page.waitForSelector('select[name="targetEmployeeId"]', { timeout: STRICT_TIMEOUT });
      await page.selectOption('select[name="targetEmployeeId"]', kpi.targetEmployeeId, { timeout: STRICT_TIMEOUT });
    }

    // Select status
    await page.selectOption('select[name="status"]', kpi.status, { timeout: STRICT_TIMEOUT });

    // Submit the form - using exact text from the button in the frontend code
    const submitButtonText = 'Update KPI';
    await page.click(`button:has-text("${submitButtonText}")`, { timeout: STRICT_TIMEOUT });

    // Wait for the form to close or success notification
    await Promise.race([
      page.waitForSelector('div:has-text("KPI updated successfully")', { timeout: STRICT_TIMEOUT }),
      page.waitForFunction(() => !document.querySelector('form:has(input[name="title"])'), { timeout: STRICT_TIMEOUT })
    ]).catch(error => {
      throw new Error(`KPI update timed out after ${STRICT_TIMEOUT}ms: ${error.message}`);
    });

    console.log(`KPI updated: ${kpi.title}`);
  } catch (error) {
    console.error(`Error updating KPI ${kpiSelector}:`, error);
    throw new Error(`Failed to update KPI ${kpiSelector}: ${error.message}`);
  }
}

// Helper function to delete a KPI
async function deleteKPI(page, kpiSelector) {
  console.log(`Deleting KPI: ${kpiSelector}...`);

  try {
    // Navigate to KPIs page
    await page.goto(`${BASE_URL}/kpis`, { timeout: STRICT_TIMEOUT });

    // Find the KPI by title and click the delete button
    const kpiRow = await page.waitForSelector(`tr:has-text("${kpiSelector}")`, { timeout: STRICT_TIMEOUT });
    await kpiRow.hover();
    await page.click(`tr:has-text("${kpiSelector}") >> button[aria-label="Delete KPI"]`, { timeout: STRICT_TIMEOUT });

    // Confirm deletion - using exact text from the button in the frontend code
    await page.click('button:has-text("Delete")', { timeout: STRICT_TIMEOUT });

    // Wait for the deletion to complete or success notification
    await Promise.race([
      page.waitForSelector('div:has-text("KPI deleted successfully")', { timeout: STRICT_TIMEOUT }),
      page.waitForFunction(() => !document.querySelector(`tr:has-text("${kpiSelector}")`), { timeout: STRICT_TIMEOUT })
    ]).catch(error => {
      throw new Error(`KPI deletion timed out after ${STRICT_TIMEOUT}ms: ${error.message}`);
    });

    console.log(`KPI deleted: ${kpiSelector}`);
  } catch (error) {
    console.error(`Error deleting KPI ${kpiSelector}:`, error);
    throw new Error(`Failed to delete KPI ${kpiSelector}: ${error.message}`);
  }
}

// Function to run scenarios for a specific user
async function runScenariosForUser(user, scenarios) {
  console.log(`\n=== Running scenarios for ${user.username} ===`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  // Store for console messages
  const consoleMessages = [];

  // Enable console logging with detailed categorization
  context.on('console', msg => {
    const messageType = msg.type();
    const messageText = msg.text();
    const messageLocation = msg.location().url ? ` (at ${msg.location().url})` : '';

    // Store all console messages
    consoleMessages.push({
      type: messageType,
      text: messageText,
      location: messageLocation,
      timestamp: new Date().toISOString()
    });

    // Log to console with appropriate formatting
    if (messageType === 'error') {
      console.error(`Browser console ERROR: ${messageText}${messageLocation}`);
    } else if (messageType === 'warning') {
      console.warn(`Browser console WARNING: ${messageText}${messageLocation}`);
    } else {
      console.log(`Browser console [${messageType}]: ${messageText}${messageLocation}`);
    }
  });

  const page = await context.newPage();

  // Store test results
  const results = [];

  try {
    // Login as the specified user
    await login(page, user.username, user.password);

    // Run each scenario
    for (const scenario of scenarios) {
      try {
        console.log(`\n=== Running scenario: ${scenario.name} ===`);

        // Clear console messages for this scenario
        const scenarioConsoleMessages = [...consoleMessages];
        consoleMessages.length = 0;

        // Perform the specified action
        switch (scenario.action) {
          case 'create':
            await createKPI(page, scenario.kpi);
            break;
          case 'update':
            await updateKPI(page, scenario.kpiSelector, scenario.kpi);
            break;
          case 'delete':
            await deleteKPI(page, scenario.kpiSelector);
            break;
        }

        // Check for console errors during this scenario
        const scenarioErrors = consoleMessages.filter(msg => msg.type === 'error');

        if (scenarioErrors.length > 0) {
          console.warn(`Found ${scenarioErrors.length} console errors during scenario ${scenario.name}`);

          results.push({
            scenario: scenario.name,
            status: 'WARN',
            error: `${scenarioErrors.length} console errors detected`,
            consoleErrors: scenarioErrors
          });
        } else {
          results.push({
            scenario: scenario.name,
            status: 'PASS',
            error: null,
            consoleMessages: consoleMessages.length > 0 ? consoleMessages : null
          });
        }

      } catch (error) {
        console.error(`Error in scenario ${scenario.name}:`, error);

        results.push({
          scenario: scenario.name,
          status: 'FAIL',
          error: error.message,
          consoleMessages: consoleMessages.length > 0 ? consoleMessages : null
        });

        // Take a screenshot of the failure
        await page.screenshot({ path: `${scenario.name.replace(/\s+/g, '_')}_error.png` });
      }
    }
  } catch (error) {
    console.error(`Error during test execution for ${user.username}:`, error);
  } finally {
    // Close the browser
    await browser.close();
  }

  return results;
}

// Function to generate a detailed test report
function generateTestReport(adminResults, managerResults, startTime, endTime) {
  const now = new Date();
  const reportDate = now.toISOString().split('T')[0];
  const reportTime = now.toTimeString().split(' ')[0];

  let report = `# KPI End-to-End Test Execution Report\n\n`;
  report += `Generated: ${reportDate} ${reportTime}\n\n`;

  report += `## Summary\n\n`;

  const totalTests = adminResults.length + managerResults.length;
  const passedTests = [...adminResults, ...managerResults].filter(r => r.status === 'PASS').length;
  const warnTests = [...adminResults, ...managerResults].filter(r => r.status === 'WARN').length;
  const failedTests = [...adminResults, ...managerResults].filter(r => r.status === 'FAIL').length;

  // Calculate execution time
  const executionTimeMs = endTime - startTime;
  const executionTimeSeconds = (executionTimeMs / 1000).toFixed(2);

  report += `- Total Tests: ${totalTests}\n`;
  report += `- Passed: ${passedTests}\n`;
  report += `- Warnings: ${warnTests}\n`;
  report += `- Failed: ${failedTests}\n`;
  report += `- Execution Time: ${executionTimeSeconds} seconds\n\n`;

  report += `## Admin User Tests\n\n`;
  adminResults.forEach(result => {
    report += `### ${result.scenario}\n`;
    report += `- Status: ${result.status}\n`;
    if (result.error) {
      report += `- Error: ${result.error}\n`;
    }
    if (result.consoleErrors && result.consoleErrors.length > 0) {
      report += `- Console Errors:\n`;
      result.consoleErrors.forEach(err => {
        report += `  - ${err.text}\n`;
      });
    }
    report += `\n`;
  });

  report += `## Manager User Tests\n\n`;
  managerResults.forEach(result => {
    report += `### ${result.scenario}\n`;
    report += `- Status: ${result.status}\n`;
    if (result.error) {
      report += `- Error: ${result.error}\n`;
    }
    if (result.consoleErrors && result.consoleErrors.length > 0) {
      report += `- Console Errors:\n`;
      result.consoleErrors.forEach(err => {
        report += `  - ${err.text}\n`;
      });
    }
    report += `\n`;
  });

  return report;
}

// Function to generate a summary report
function generateSummaryReport(adminResults, managerResults, startTime, endTime, detailedReportFilename) {
  const now = new Date();
  const reportDate = now.toISOString().split('T')[0];
  const reportTime = now.toTimeString().split(' ')[0];

  let report = `# KPI End-to-End Test Summary Report\n\n`;
  report += `Generated: ${reportDate} ${reportTime}\n\n`;

  // Calculate overall statistics
  const totalTests = adminResults.length + managerResults.length;
  const passedTests = [...adminResults, ...managerResults].filter(r => r.status === 'PASS').length;
  const warnTests = [...adminResults, ...managerResults].filter(r => r.status === 'WARN').length;
  const failedTests = [...adminResults, ...managerResults].filter(r => r.status === 'FAIL').length;

  // Calculate pass rate
  const passRate = ((passedTests / totalTests) * 100).toFixed(2);

  // Calculate execution time
  const executionTimeMs = endTime - startTime;
  const executionTimeSeconds = (executionTimeMs / 1000).toFixed(2);

  report += `## Executive Summary\n\n`;
  report += `This report summarizes the execution of end-to-end tests for KPI functionality. `;

  if (failedTests === 0 && warnTests === 0) {
    report += `All tests passed successfully.\n\n`;
  } else if (failedTests === 0) {
    report += `All tests completed without failures, but ${warnTests} test(s) generated warnings.\n\n`;
  } else {
    report += `${failedTests} test(s) failed during execution.\n\n`;
  }

  report += `## Test Statistics\n\n`;
  report += `- **Total Tests**: ${totalTests}\n`;
  report += `- **Passed**: ${passedTests} (${passRate}%)\n`;
  report += `- **Warnings**: ${warnTests}\n`;
  report += `- **Failed**: ${failedTests}\n`;
  report += `- **Execution Time**: ${executionTimeSeconds} seconds\n\n`;

  report += `## Results by User Role\n\n`;

  // Admin statistics
  const adminTotal = adminResults.length;
  const adminPassed = adminResults.filter(r => r.status === 'PASS').length;
  const adminWarnings = adminResults.filter(r => r.status === 'WARN').length;
  const adminFailed = adminResults.filter(r => r.status === 'FAIL').length;
  const adminPassRate = ((adminPassed / adminTotal) * 100).toFixed(2);

  report += `### Admin User\n`;
  report += `- Tests: ${adminTotal}\n`;
  report += `- Passed: ${adminPassed} (${adminPassRate}%)\n`;
  report += `- Warnings: ${adminWarnings}\n`;
  report += `- Failed: ${adminFailed}\n\n`;

  // Manager statistics
  const managerTotal = managerResults.length;
  const managerPassed = managerResults.filter(r => r.status === 'PASS').length;
  const managerWarnings = managerResults.filter(r => r.status === 'WARN').length;
  const managerFailed = managerResults.filter(r => r.status === 'FAIL').length;
  const managerPassRate = ((managerPassed / managerTotal) * 100).toFixed(2);

  report += `### Manager User\n`;
  report += `- Tests: ${managerTotal}\n`;
  report += `- Passed: ${managerPassed} (${managerPassRate}%)\n`;
  report += `- Warnings: ${managerWarnings}\n`;
  report += `- Failed: ${managerFailed}\n\n`;

  // Failed tests section
  const allResults = [...adminResults, ...managerResults];
  const failedResults = allResults.filter(r => r.status === 'FAIL');

  if (failedResults.length > 0) {
    report += `## Failed Tests\n\n`;
    failedResults.forEach(result => {
      report += `### ${result.scenario}\n`;
      report += `- Error: ${result.error}\n\n`;
    });
  }

  // Warning tests section
  const warnResults = allResults.filter(r => r.status === 'WARN');

  if (warnResults.length > 0) {
    report += `## Tests with Warnings\n\n`;
    warnResults.forEach(result => {
      report += `### ${result.scenario}\n`;
      report += `- Warning: ${result.error}\n\n`;
    });
  }

  // Console errors summary
  const testsWithConsoleErrors = allResults.filter(r => r.consoleErrors && r.consoleErrors.length > 0);

  if (testsWithConsoleErrors.length > 0) {
    report += `## Browser Console Errors\n\n`;
    report += `${testsWithConsoleErrors.length} test(s) generated browser console errors.\n\n`;

    testsWithConsoleErrors.forEach(result => {
      report += `### ${result.scenario}\n`;
      report += `- Number of errors: ${result.consoleErrors.length}\n\n`;
    });
  }

  // Link to detailed report
  report += `## Detailed Report\n\n`;
  report += `For more detailed information, please refer to the [detailed test execution report](${detailedReportFilename}).\n\n`;

  // Conclusion
  report += `## Conclusion\n\n`;

  if (failedTests === 0 && warnTests === 0) {
    report += `All KPI end-to-end tests passed successfully. The application is functioning as expected for KPI creation, update, and deletion operations with both Admin and Manager roles.`;
  } else if (failedTests === 0) {
    report += `All KPI end-to-end tests completed without failures, but some tests generated warnings. These warnings should be reviewed to ensure they don't indicate potential issues.`;
  } else {
    report += `Some KPI end-to-end tests failed during execution. These failures should be investigated and addressed before proceeding.`;
  }

  return report;
}

// Main test function
async function runTests() {
  console.log('Starting KPI End-to-End Tests');

  // Record start time
  const startTime = Date.now();

  // Run admin scenarios
  console.log('\n=== Running Admin Scenarios ===');
  const adminResults = await runScenariosForUser(ADMIN_USER, adminScenarios);

  // Run manager scenarios in a new browser session
  console.log('\n=== Running Manager Scenarios ===');
  const managerResults = await runScenariosForUser(MANAGER_USER, managerScenarios);

  // Record end time
  const endTime = Date.now();

  // Generate and save detailed test report
  const fs = require('fs');
  const detailedReportFilename = `test_execution_report_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.md`;
  const detailedReport = generateTestReport(adminResults, managerResults, startTime, endTime);
  fs.writeFileSync(detailedReportFilename, detailedReport);
  console.log(`\nDetailed test report saved to ${detailedReportFilename}`);

  // Generate and save summary report
  const summaryReportFilename = `test_summary_report_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.md`;
  const summaryReport = generateSummaryReport(adminResults, managerResults, startTime, endTime, detailedReportFilename);
  fs.writeFileSync(summaryReportFilename, summaryReport);
  console.log(`Summary report saved to ${summaryReportFilename}`);

  // Print test results summary
  console.log('\n=== Test Results Summary ===');
  console.log('Admin Scenarios:');
  adminResults.forEach(result => {
    console.log(`${result.status}: ${result.scenario}${result.error ? ` - ${result.error}` : ''}`);
  });

  console.log('\nManager Scenarios:');
  managerResults.forEach(result => {
    console.log(`${result.status}: ${result.scenario}${result.error ? ` - ${result.error}` : ''}`);
  });

  // Calculate and print execution time
  const executionTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`\nTotal execution time: ${executionTimeSeconds} seconds`);
}

// Run the tests
runTests().catch(console.error);
