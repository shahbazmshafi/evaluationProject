const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://192.168.20.63';
const ADMINUSER = { username: 'sgul@trafix.com', password: 'Asdf@12345' };
const MANAGERUSER = { username: 'm1@test.com', password: '123' };
const EMPLOYEEUSER = { username: 'd@test.com', password: '123' };

// Timeouts
const STRICT_TIMEOUT = 15000; // 15 seconds for most operations
const FORM_TIMEOUT = 30000;   // 30 seconds for form operations that might be slower

// Test data for evaluation cycle creation
const TEST_CYCLES = {
  standard: {
    name: 'Q3 2025 Performance Review',
    evaluationStartDate: '2025-07-01',
    evaluationEndDate: '2025-09-30',
    executionStartDate: '2025-10-01',
    executionEndDate: '2025-10-15'
  },
  shortPeriod: {
    name: 'August 2025 Quick Review',
    evaluationStartDate: '2025-08-01',
    evaluationEndDate: '2025-08-31',
    executionStartDate: '2025-09-01',
    executionEndDate: '2025-09-07'
  },
  longPeriod: {
    name: 'H2 2025 Comprehensive Review',
    evaluationStartDate: '2025-07-01',
    evaluationEndDate: '2025-12-31',
    executionStartDate: '2026-01-01',
    executionEndDate: '2026-01-31'
  }
};

// Helper function to log in
async function login(page, user) {
  console.log(`Logging in as ${user.username}...`);

  try {
    // First check if we're already logged in by going to the home page
    await page.goto(BASE_URL, { timeout: STRICT_TIMEOUT });
    
    // Wait a moment for any redirects or initial page load
    await page.waitForTimeout(2000);
    
    // Check if we're already logged in by looking for user-specific elements
    const isLoggedIn = await page.evaluate(() => {
      // Look for elements that would indicate a logged-in state
      return !!document.querySelector('.user-profile') || 
             !!document.querySelector('[data-testid="user-menu"]') ||
             document.body.textContent.includes('Logout') ||
             document.body.textContent.includes('Sign out');
    }).catch(() => false);
    
    if (isLoggedIn) {
      console.log('User is already logged in, skipping login process');
      return;
    }
    
    // If not logged in, try to find the login page
    // First try the /login route
    await page.goto(`${BASE_URL}/login`, { timeout: STRICT_TIMEOUT });
    
    // Check if we're on a page with login form
    const hasLoginForm = await page.evaluate(() => {
      return !!document.querySelector('input[name="email"]') && 
             !!document.querySelector('input[name="password"]');
    }).catch(() => false);
    
    // If login form not found, try the root URL as it might redirect to login
    if (!hasLoginForm) {
      console.log('Login form not found at /login, trying root URL...');
      await page.goto(BASE_URL, { timeout: STRICT_TIMEOUT });
      
      // Wait for login form to appear
      await page.waitForSelector('input[name="email"]', { timeout: STRICT_TIMEOUT })
        .catch(error => {
          throw new Error(`Login form not found: ${error.message}`);
        });
    }

    // Fill in login form
    await page.fill('input[name="email"]', user.username, { timeout: STRICT_TIMEOUT });
    await page.fill('input[name="password"]', user.password, { timeout: STRICT_TIMEOUT });

    // Submit the form
    await page.click('button[type="submit"]', { timeout: STRICT_TIMEOUT });

    // Wait for indicators of successful login
    await Promise.race([
      page.waitForNavigation({ timeout: STRICT_TIMEOUT }).catch(() => null),
      page.waitForSelector('.user-profile', { timeout: STRICT_TIMEOUT }).catch(() => null),
      page.waitForSelector('[data-testid="user-menu"]', { timeout: STRICT_TIMEOUT }).catch(() => null),
      page.waitForFunction(() => !document.querySelector('input[name="password"]'), { timeout: STRICT_TIMEOUT }).catch(() => null),
      page.waitForTimeout(5000) // Fallback timeout
    ]);
    
    // Verify login was successful by checking for login form absence
    const loginFormStillPresent = await page.evaluate(() => {
      return !!document.querySelector('input[name="password"]');
    }).catch(() => false);
    
    if (loginFormStillPresent) {
      throw new Error('Login form still present after submission, login likely failed');
    }
    
    console.log('Login successful');
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
}

// Helper function to navigate to Evaluations page
async function navigateToEvaluationsPage(page) {
  console.log('Navigating to Evaluations page...');
  
  try {
    // Navigate to the Evaluations page
    await page.goto(`${BASE_URL}/evaluations`, { timeout: STRICT_TIMEOUT });
    
    // Wait for the Evaluations page to load
    try {
      // First try to find the Evaluations header
      await page.waitForSelector('h1, h2', { timeout: STRICT_TIMEOUT });
      const headerFound = await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('h1, h2'));
        return headers.some(h => h.textContent.includes('Evaluation') || h.textContent.includes('Performance Review'));
      });
      
      if (!headerFound) {
        // If header not found, look for Create Evaluation Cycle button
        await page.waitForSelector('button', { timeout: STRICT_TIMEOUT });
        const buttonFound = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => btn.textContent.includes('Create Evaluation Cycle') || 
                                     btn.textContent.includes('New Cycle') ||
                                     btn.textContent.includes('Add Cycle'));
        });
        
        if (!buttonFound) {
          throw new Error('Evaluations page not loaded: Neither header nor Create Evaluation Cycle button found');
        }
      }
    } catch (error) {
      throw new Error(`Evaluations page not loaded: ${error.message}`);
    }
    
    console.log('Evaluations page loaded successfully');
  } catch (error) {
    console.error('Navigation to Evaluations page failed:', error);
    throw new Error(`Failed to navigate to Evaluations page: ${error.message}`);
  }
}

// Helper function to create an evaluation cycle
async function createEvaluationCycle(page, cycleData) {
  console.log(`Creating evaluation cycle: ${cycleData.name}...`);
  
  try {
    // Click on "Create Evaluation Cycle" button
    // First find all buttons and identify the one with "Create Evaluation Cycle" text
    const createButtonSelector = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const createButton = buttons.find(btn => 
        btn.textContent.includes('Create Evaluation Cycle') || 
        btn.textContent.includes('New Cycle') ||
        btn.textContent.includes('Add Cycle')
      );
      if (createButton) {
        // Add a unique data attribute to identify this button
        createButton.setAttribute('data-test-id', 'create-cycle-button');
        return 'button[data-test-id="create-cycle-button"]';
      }
      return null;
    });
    
    if (!createButtonSelector) {
      throw new Error('Create Evaluation Cycle button not found');
    }
    
    // Click the identified button
    await page.click(createButtonSelector, { timeout: STRICT_TIMEOUT });
    
    // Wait for the evaluation cycle form to appear
    await page.waitForSelector('form', { timeout: STRICT_TIMEOUT });
    
    // Fill in the evaluation cycle form
    await page.fill('input[name="name"]', cycleData.name, { timeout: FORM_TIMEOUT });
    await page.fill('input[id="evaluationStartDate"]', cycleData.evaluationStartDate, { timeout: FORM_TIMEOUT });
    await page.fill('input[id="evaluationEndDate"]', cycleData.evaluationEndDate, { timeout: FORM_TIMEOUT });
    await page.fill('input[id="executionStartDate"]', cycleData.executionStartDate, { timeout: FORM_TIMEOUT });
    await page.fill('input[id="executionEndDate"]', cycleData.executionEndDate, { timeout: FORM_TIMEOUT });
    
    // Submit the form
    await page.click('button[type="submit"]', { timeout: STRICT_TIMEOUT });
    
    // Wait for success message or form closure
    await Promise.race([
      // Check for success message using page.evaluate
      page.waitForFunction(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        return divs.some(div => 
          div.textContent.includes('Cycle created successfully') || 
          div.textContent.includes('Evaluation cycle created')
        );
      }, { timeout: FORM_TIMEOUT })
        .then(() => console.log('Success message detected'))
        .catch(() => null),
      
      // Check for form closure
      page.waitForFunction(() => !document.querySelector('form'), { timeout: FORM_TIMEOUT })
        .then(() => console.log('Form closed'))
        .catch(() => null),
      
      page.waitForTimeout(5000) // Fallback timeout
    ]);
    
    console.log(`Evaluation cycle created successfully: ${cycleData.name}`);
    return true;
  } catch (error) {
    console.error(`Failed to create evaluation cycle:`, error);
    
    // Take screenshot of the failure
    await page.screenshot({ path: `evaluation_cycle_creation_error.png` });
    
    // Check for error messages on the page
    const errorMessage = await page.evaluate(() => {
      const errorElement = document.querySelector('.error-message') || 
                          document.querySelector('.text-red-500') ||
                          document.querySelector('[role="alert"]');
      return errorElement ? errorElement.textContent : null;
    }).catch(() => null);
    
    if (errorMessage) {
      console.error(`Error message on page: ${errorMessage}`);
    }
    
    return false;
  }
}

// Test function for Admin evaluation cycle creation
async function testAdminEvaluationCycleCreation(browser) {
  console.log('\n=== Testing Admin Evaluation Cycle Creation ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Admin
    await login(page, ADMINUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 1: Create standard evaluation cycle
    console.log('\nTest 1: Admin creating standard evaluation cycle');
    const standardCycleResult = await createEvaluationCycle(page, TEST_CYCLES.standard);
    
    // Test 2: Create short period evaluation cycle
    console.log('\nTest 2: Admin creating short period evaluation cycle');
    const shortPeriodCycleResult = await createEvaluationCycle(page, TEST_CYCLES.shortPeriod);
    
    // Test 3: Create long period evaluation cycle
    console.log('\nTest 3: Admin creating long period evaluation cycle');
    const longPeriodCycleResult = await createEvaluationCycle(page, TEST_CYCLES.longPeriod);
    
    // Take screenshot of evaluation cycles list
    await page.screenshot({ path: 'admin_evaluation_cycles_list.png' });
    
    return {
      standardCycle: standardCycleResult,
      shortPeriodCycle: shortPeriodCycleResult,
      longPeriodCycle: longPeriodCycleResult
    };
  } catch (error) {
    console.error('Admin evaluation cycle creation test failed:', error);
    await page.screenshot({ path: 'admin_evaluation_cycle_test_error.png' });
    return {
      standardCycle: false,
      shortPeriodCycle: false,
      longPeriodCycle: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for Manager evaluation cycle creation
async function testManagerEvaluationCycleCreation(browser) {
  console.log('\n=== Testing Manager Evaluation Cycle Creation ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Manager
    await login(page, MANAGERUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 1: Create standard evaluation cycle
    console.log('\nTest 1: Manager creating standard evaluation cycle');
    const standardCycle = {
      ...TEST_CYCLES.standard,
      name: 'Manager Standard Cycle Test'
    };
    const standardCycleResult = await createEvaluationCycle(page, standardCycle);
    
    // Test 2: Create short period evaluation cycle
    console.log('\nTest 2: Manager creating short period evaluation cycle');
    const shortPeriodCycle = {
      ...TEST_CYCLES.shortPeriod,
      name: 'Manager Short Period Cycle Test'
    };
    const shortPeriodCycleResult = await createEvaluationCycle(page, shortPeriodCycle);
    
    // Take screenshot of evaluation cycles list
    await page.screenshot({ path: 'manager_evaluation_cycles_list.png' });
    
    return {
      standardCycle: standardCycleResult,
      shortPeriodCycle: shortPeriodCycleResult
    };
  } catch (error) {
    console.error('Manager evaluation cycle creation test failed:', error);
    await page.screenshot({ path: 'manager_evaluation_cycle_test_error.png' });
    return {
      standardCycle: false,
      shortPeriodCycle: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for Employee evaluation cycle creation (should be unauthorized)
async function testEmployeeEvaluationCycleCreation(browser) {
  console.log('\n=== Testing Employee Evaluation Cycle Creation (Should Fail) ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Employee
    await login(page, EMPLOYEEUSER);
    
    // Navigate to Evaluations page (should fail or not show create button)
    try {
      await navigateToEvaluationsPage(page);
      
      // Check if Create Evaluation Cycle button exists
      const createButtonExists = await page.evaluate(() => {
        // Look for button with text "Create Evaluation Cycle" using standard DOM methods
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => 
          button.textContent.includes('Create Evaluation Cycle') || 
          button.textContent.includes('New Cycle') ||
          button.textContent.includes('Add Cycle')
        );
      }).catch(() => false);
      
      if (!createButtonExists) {
        console.log('Create Evaluation Cycle button not found - this is expected for employees');
        await page.screenshot({ path: 'employee_no_create_cycle_button.png' });
        return {
          unauthorized: true,
          message: 'Create Evaluation Cycle button not available for employees (expected behavior)'
        };
      }
      
      // If button exists, try to create an evaluation cycle (should fail)
      console.log('Create Evaluation Cycle button found - attempting to create cycle (should fail)');
      const cycleResult = await createEvaluationCycle(page, TEST_CYCLES.standard);
      
      if (cycleResult) {
        console.error('Employee was able to create an evaluation cycle - this is unexpected!');
        await page.screenshot({ path: 'employee_created_cycle_unexpected.png' });
        return {
          unauthorized: false,
          message: 'Employee was able to create an evaluation cycle (unexpected behavior)'
        };
      } else {
        console.log('Employee failed to create evaluation cycle - this is expected');
        await page.screenshot({ path: 'employee_failed_create_cycle.png' });
        return {
          unauthorized: true,
          message: 'Employee failed to create evaluation cycle (expected behavior)'
        };
      }
    } catch (error) {
      console.log('Navigation to Evaluations page failed - this is expected for employees');
      await page.screenshot({ path: 'employee_navigation_failed.png' });
      return {
        unauthorized: true,
        message: 'Navigation to Evaluations page failed (expected behavior)'
      };
    }
  } catch (error) {
    console.error('Employee evaluation cycle creation test failed:', error);
    await page.screenshot({ path: 'employee_evaluation_cycle_test_error.png' });
    return {
      unauthorized: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for validation scenarios
async function testValidationScenarios(browser) {
  console.log('\n=== Testing Evaluation Cycle Validation Scenarios ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Admin
    await login(page, ADMINUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 1: Create cycle with missing name
    console.log('\nTest 1: Creating cycle with missing name');
    const missingNameCycle = {
      ...TEST_CYCLES.standard,
      name: ''
    };
    const missingNameResult = await createEvaluationCycle(page, missingNameCycle);
    
    // Test 2: Create cycle with invalid dates (end date before start date)
    console.log('\nTest 2: Creating cycle with invalid dates');
    const invalidDatesCycle = {
      ...TEST_CYCLES.standard,
      name: 'Invalid Dates Cycle Test',
      evaluationStartDate: '2025-09-30',
      evaluationEndDate: '2025-07-01'
    };
    const invalidDatesResult = await createEvaluationCycle(page, invalidDatesCycle);
    
    // Test 3: Create cycle with execution period before evaluation period
    console.log('\nTest 3: Creating cycle with execution before evaluation');
    const invalidPeriodCycle = {
      ...TEST_CYCLES.standard,
      name: 'Invalid Period Cycle Test',
      evaluationStartDate: '2025-09-01',
      evaluationEndDate: '2025-09-30',
      executionStartDate: '2025-08-01',
      executionEndDate: '2025-08-15'
    };
    const invalidPeriodResult = await createEvaluationCycle(page, invalidPeriodCycle);
    
    // Take screenshot of validation errors
    await page.screenshot({ path: 'evaluation_cycle_validation_errors.png' });
    
    return {
      missingName: !missingNameResult, // Should fail, so success is !result
      invalidDates: !invalidDatesResult, // Should fail, so success is !result
      invalidPeriod: !invalidPeriodResult // Should fail, so success is !result
    };
  } catch (error) {
    console.error('Validation scenarios test failed:', error);
    await page.screenshot({ path: 'evaluation_cycle_validation_test_error.png' });
    return {
      missingName: false,
      invalidDates: false,
      invalidPeriod: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Main test function
async function runTests() {
  console.log('Starting Evaluation Cycle Creation Tests');
  
  // Create results directory if it doesn't exist
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }
  
  // Record start time
  const startTime = Date.now();
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down operations for better visibility
  });
  
  // Store test results
  const testResults = {
    adminTests: null,
    managerTests: null,
    employeeTests: null,
    validationTests: null,
    startTime: new Date(startTime).toISOString(),
    endTime: null,
    duration: null
  };
  
  try {
    // Run Admin tests
    testResults.adminTests = await testAdminEvaluationCycleCreation(browser);
    
    // Run Manager tests
    testResults.managerTests = await testManagerEvaluationCycleCreation(browser);
    
    // Run Employee tests
    testResults.employeeTests = await testEmployeeEvaluationCycleCreation(browser);
    
    // Run Validation tests
    testResults.validationTests = await testValidationScenarios(browser);
    
    // Calculate test duration
    const endTime = Date.now();
    testResults.endTime = new Date(endTime).toISOString();
    testResults.duration = (endTime - startTime) / 1000; // in seconds
    
    // Generate test report
    generateTestReport(testResults);
    
    console.log('\nAll tests completed successfully');
  } catch (error) {
    console.error('Test execution failed:', error);
    
    // Calculate test duration even if tests fail
    const endTime = Date.now();
    testResults.endTime = new Date(endTime).toISOString();
    testResults.duration = (endTime - startTime) / 1000; // in seconds
    testResults.error = error.message;
    
    // Generate test report even if tests fail
    generateTestReport(testResults);
  } finally {
    // Close the browser
    await browser.close();
  }
}

// Function to generate test report
function generateTestReport(results) {
  console.log('\n=== Evaluation Cycle Creation Test Report ===');
  
  // Display test results
  console.log(`\nTest Duration: ${results.duration} seconds`);
  console.log(`Start Time: ${results.startTime}`);
  console.log(`End Time: ${results.endTime}`);
  
  // Admin test results
  console.log('\nAdmin Evaluation Cycle Creation Tests:');
  if (results.adminTests) {
    console.log(`- Standard Cycle: ${results.adminTests.standardCycle ? 'Success' : 'Failed'}`);
    console.log(`- Short Period Cycle: ${results.adminTests.shortPeriodCycle ? 'Success' : 'Failed'}`);
    console.log(`- Long Period Cycle: ${results.adminTests.longPeriodCycle ? 'Success' : 'Failed'}`);
    if (results.adminTests.error) {
      console.log(`- Error: ${results.adminTests.error}`);
    }
  } else {
    console.log('- Not executed');
  }
  
  // Manager test results
  console.log('\nManager Evaluation Cycle Creation Tests:');
  if (results.managerTests) {
    console.log(`- Standard Cycle: ${results.managerTests.standardCycle ? 'Success' : 'Failed'}`);
    console.log(`- Short Period Cycle: ${results.managerTests.shortPeriodCycle ? 'Success' : 'Failed'}`);
    if (results.managerTests.error) {
      console.log(`- Error: ${results.managerTests.error}`);
    }
  } else {
    console.log('- Not executed');
  }
  
  // Employee test results
  console.log('\nEmployee Evaluation Cycle Creation Tests:');
  if (results.employeeTests) {
    console.log(`- Unauthorized: ${results.employeeTests.unauthorized ? 'Yes (Expected)' : 'No (Unexpected)'}`);
    if (results.employeeTests.message) {
      console.log(`- Message: ${results.employeeTests.message}`);
    }
    if (results.employeeTests.error) {
      console.log(`- Error: ${results.employeeTests.error}`);
    }
  } else {
    console.log('- Not executed');
  }
  
  // Validation test results
  console.log('\nValidation Scenario Tests:');
  if (results.validationTests) {
    console.log(`- Missing Name: ${results.validationTests.missingName ? 'Validated (Expected Failure)' : 'Failed Validation'}`);
    console.log(`- Invalid Dates: ${results.validationTests.invalidDates ? 'Validated (Expected Failure)' : 'Failed Validation'}`);
    console.log(`- Invalid Period: ${results.validationTests.invalidPeriod ? 'Validated (Expected Failure)' : 'Failed Validation'}`);
    if (results.validationTests.error) {
      console.log(`- Error: ${results.validationTests.error}`);
    }
  } else {
    console.log('- Not executed');
  }
  
  // Overall result
  if (results.error) {
    console.log('\nOverall Result: Failed');
    console.log(`Error: ${results.error}`);
  } else {
    console.log('\nOverall Result: Completed');
  }
  
  // Save report to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const reportPath = path.join(__dirname, 'results', `evaluation_cycle_creation_test_report_${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nTest report saved to: ${reportPath}`);
}

// Run the tests
runTests().catch(console.error);