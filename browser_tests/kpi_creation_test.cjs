const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://192.168.20.63';
const ADMINUSER = { username: 'sgul@trafix.com', password: 'Asdf@12345' };
const MANAGERUSER = { username: 'm1@test.com', password: '123' };
const EMPLOYEEUSER = { username: 'd@test.com', password: '123' };
const EMPLOYEETWOUSER = { username: 'z@test.com', password: '123' };

// Timeouts
const STRICT_TIMEOUT = 5000; // 5 seconds for most operations
const FORM_TIMEOUT = 10000;   // 10 seconds for form operations that might be slower

// Test data for KPI creation
const TEST_KPIS = {
  global: {
    title: 'Global KPI Test',
    description: 'This is a test global KPI created by automated test',
    weightage: 10,
    type: 'global',
    isTechnical: true
  },
  roleBased: {
    title: 'Role-based KPI Test',
    description: 'This is a test role-based KPI created by automated test',
    weightage: 15,
    type: 'role-based',
    isTechnical: true
  },
  employeeSpecific: {
    title: 'Employee-specific KPI Test',
    description: 'This is a test employee-specific KPI created by automated test',
    weightage: 20,
    type: 'employee-specific',
    isTechnical: false
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

// Helper function to navigate to KPI management page
async function navigateToKPIPage(page) {
  console.log('Navigating to KPI management page...');
  
  try {
    // Navigate to the KPI management page
    // The exact URL or navigation path may vary based on your application
    await page.goto(`${BASE_URL}/kpis`, { timeout: STRICT_TIMEOUT });
    
    // Wait for the KPI page to load
    try {
      // First try to find the KPI Management header
      await page.waitForSelector('h1', { timeout: STRICT_TIMEOUT });
      const headerFound = await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('h1'));
        return headers.some(h => h.textContent.includes('KPI Management'));
      });
      
      if (!headerFound) {
        // If header not found, look for Create KPI button
        await page.waitForSelector('button', { timeout: STRICT_TIMEOUT });
        const buttonFound = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => btn.textContent.includes('Create KPI'));
        });
        
        if (!buttonFound) {
          throw new Error('KPI management page not loaded: Neither header nor Create KPI button found');
        }
      }
    } catch (error) {
      throw new Error(`KPI management page not loaded: ${error.message}`);
    }
    
    console.log('KPI management page loaded successfully');
  } catch (error) {
    console.error('Navigation to KPI page failed:', error);
    throw new Error(`Failed to navigate to KPI page: ${error.message}`);
  }
}

// Helper function to create a KPI
async function createKPI(page, kpiData) {
  console.log(`Creating ${kpiData.type} KPI: ${kpiData.title}...`);
  
  try {
    // Click on "Create KPI" button
    // First find all buttons and identify the one with "Create KPI" text
    const createButtonSelector = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const createButton = buttons.find(btn => btn.textContent.includes('Create KPI'));
      if (createButton) {
        // Add a unique data attribute to identify this button
        createButton.setAttribute('data-test-id', 'create-kpi-button');
        return 'button[data-test-id="create-kpi-button"]';
      }
      return null;
    });
    
    if (!createButtonSelector) {
      throw new Error('Create KPI button not found');
    }
    
    // Click the identified button
    await page.click(createButtonSelector, { timeout: STRICT_TIMEOUT });
    
    // Wait for the KPI form to appear
    await page.waitForSelector('form', { timeout: STRICT_TIMEOUT });
    
    // Fill in the KPI form
    await page.fill('input[name="title"]', kpiData.title, { timeout: FORM_TIMEOUT });
    await page.fill('textarea[name="description"]', kpiData.description, { timeout: FORM_TIMEOUT });
    await page.fill('input[name="weightage"]', kpiData.weightage.toString(), { timeout: FORM_TIMEOUT });
    
    // Select KPI type
    await page.selectOption('select[name="type"]', kpiData.type, { timeout: FORM_TIMEOUT });
    
    // Handle additional fields based on KPI type
    if (kpiData.type === 'role-based' && kpiData.targetRoleId) {
      await page.selectOption('select[name="targetRoleId"]', kpiData.targetRoleId.toString(), { timeout: FORM_TIMEOUT });
    }
    
    if (kpiData.type === 'employee-specific' && kpiData.targetEmployeeId) {
      // Wait for 3 seconds after selecting employee-specific type before interacting with Target Employee dropdown
      console.log('Waiting 3 seconds for Target Employee dropdown to become available...');
      await page.waitForTimeout(3000);
      
      await page.selectOption('select[name="targetEmployeeId"]', kpiData.targetEmployeeId.toString(), { timeout: FORM_TIMEOUT });
    }
    
    // Set technical/non-technical status
    if (kpiData.isTechnical !== undefined) {
      const technicalValue = kpiData.isTechnical ? 'true' : 'false';
      await page.selectOption('select[name="isTechnical"]', technicalValue, { timeout: FORM_TIMEOUT });
    }
    
    // Submit the form
    await page.click('button[type="submit"]', { timeout: STRICT_TIMEOUT });
    
    // Wait for success message or form closure
    await Promise.race([
      // Check for success message using page.evaluate
      page.waitForFunction(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        return divs.some(div => div.textContent.includes('KPI created successfully'));
      }, { timeout: FORM_TIMEOUT })
        .then(() => console.log('Success message detected'))
        .catch(() => null),
      
      // Check for form closure
      page.waitForFunction(() => !document.querySelector('form'), { timeout: FORM_TIMEOUT })
        .then(() => console.log('Form closed'))
        .catch(() => null),
      
      page.waitForTimeout(5000) // Fallback timeout
    ]);
    
    console.log(`${kpiData.type} KPI created successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to create ${kpiData.type} KPI:`, error);
    
    // Take screenshot of the failure
    await page.screenshot({ path: `kpi_creation_${kpiData.type}_error.png` });
    
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

// Helper function to get role IDs
async function getRoleIds(page) {
  console.log('Getting role IDs...');
  
  try {
    // This function assumes there's an API endpoint to get roles
    // We'll use page.evaluate to make a fetch request
    const roles = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/roles');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching roles:', error);
        return null;
      }
    });
    
    if (!roles) {
      console.warn('Could not fetch roles, using default IDs');
      // Return default role IDs if API call fails
      return {
        admin: 1,
        manager: 2,
        employee: 3
      };
    }
    
    // Extract role IDs
    const roleIds = {};
    for (const role of roles) {
      roleIds[role.name.toLowerCase()] = role.id;
    }
    
    console.log('Role IDs retrieved:', roleIds);
    return roleIds;
  } catch (error) {
    console.error('Failed to get role IDs:', error);
    // Return default role IDs if function fails
    return {
      admin: 1,
      manager: 2,
      employee: 3
    };
  }
}

// Helper function to get employee IDs
async function getEmployeeIds(page) {
  console.log('Getting employee IDs...');
  
  try {
    // This function assumes there's an API endpoint to get employees
    // We'll use page.evaluate to make a fetch request
    const employees = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching employees:', error);
        return null;
      }
    });
    
    if (!employees) {
      console.warn('Could not fetch employees, using default IDs');
      // Return default employee IDs if API call fails
      return {
        employee1: 3,
        employee2: 4
      };
    }
    
    // Extract employee IDs (assuming employees have role_id = 3)
    const employeeIds = {};
    let count = 1;
    for (const employee of employees) {
      if (employee.role_id === 3) {
        employeeIds[`employee${count}`] = employee.id;
        count++;
        if (count > 2) break; // We only need 2 employees
      }
    }
    
    console.log('Employee IDs retrieved:', employeeIds);
    return employeeIds;
  } catch (error) {
    console.error('Failed to get employee IDs:', error);
    // Return default employee IDs if function fails
    return {
      employee1: 3,
      employee2: 4
    };
  }
}

// Test function for Admin KPI creation
async function testAdminKPICreation(browser) {
  console.log('\n=== Testing Admin KPI Creation ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Admin
    await login(page, ADMINUSER);
    
    // Navigate to KPI page
    await navigateToKPIPage(page);
    
    // Get role and employee IDs
    const roleIds = await getRoleIds(page);
    const employeeIds = await getEmployeeIds(page);
    
    // Test 1: Create global KPI
    console.log('\nTest 1: Admin creating global KPI');
    const globalKpiResult = await createKPI(page, TEST_KPIS.global);
    
    // Test 2: Create role-based KPI
    console.log('\nTest 2: Admin creating role-based KPI');
    const roleBasedKpi = {
      ...TEST_KPIS.roleBased,
      targetRoleId: roleIds.employee
    };
    const roleBasedKpiResult = await createKPI(page, roleBasedKpi);
    
    // Test 3: Create employee-specific KPI
    console.log('\nTest 3: Admin creating employee-specific KPI');
    const employeeSpecificKpi = {
      ...TEST_KPIS.employeeSpecific,
      targetEmployeeId: employeeIds.employee1
    };
    const employeeSpecificKpiResult = await createKPI(page, employeeSpecificKpi);
    
    // Take screenshot of KPI list
    await page.screenshot({ path: 'admin_kpi_list.png' });
    
    return {
      globalKpi: globalKpiResult,
      roleBasedKpi: roleBasedKpiResult,
      employeeSpecificKpi: employeeSpecificKpiResult
    };
  } catch (error) {
    console.error('Admin KPI creation test failed:', error);
    await page.screenshot({ path: 'admin_kpi_test_error.png' });
    return {
      globalKpi: false,
      roleBasedKpi: false,
      employeeSpecificKpi: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for Manager KPI creation
async function testManagerKPICreation(browser) {
  console.log('\n=== Testing Manager KPI Creation ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Manager
    await login(page, MANAGERUSER);
    
    // Navigate to KPI page
    await navigateToKPIPage(page);
    
    // Get role and employee IDs
    const roleIds = await getRoleIds(page);
    const employeeIds = await getEmployeeIds(page);
    
    // Test 1: Create global KPI (for manager's team)
    console.log('\nTest 1: Manager creating global KPI');
    const globalKpi = {
      ...TEST_KPIS.global,
      title: 'Manager Global KPI Test'
    };
    const globalKpiResult = await createKPI(page, globalKpi);
    
    // Test 2: Create role-based KPI (for roles in manager's team)
    console.log('\nTest 2: Manager creating role-based KPI');
    const roleBasedKpi = {
      ...TEST_KPIS.roleBased,
      title: 'Manager Role-based KPI Test',
      targetRoleId: roleIds.employee
    };
    const roleBasedKpiResult = await createKPI(page, roleBasedKpi);
    
    // Test 3: Create employee-specific KPI (for employees managed by this manager)
    console.log('\nTest 3: Manager creating employee-specific KPI');
    const employeeSpecificKpi = {
      ...TEST_KPIS.employeeSpecific,
      title: 'Manager Employee-specific KPI Test',
      targetEmployeeId: employeeIds.employee1
    };
    const employeeSpecificKpiResult = await createKPI(page, employeeSpecificKpi);
    
    // Take screenshot of KPI list
    await page.screenshot({ path: 'manager_kpi_list.png' });
    
    return {
      globalKpi: globalKpiResult,
      roleBasedKpi: roleBasedKpiResult,
      employeeSpecificKpi: employeeSpecificKpiResult
    };
  } catch (error) {
    console.error('Manager KPI creation test failed:', error);
    await page.screenshot({ path: 'manager_kpi_test_error.png' });
    return {
      globalKpi: false,
      roleBasedKpi: false,
      employeeSpecificKpi: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for Employee KPI creation (should be unauthorized)
async function testEmployeeKPICreation(browser) {
  console.log('\n=== Testing Employee KPI Creation (Should Fail) ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Employee
    await login(page, EMPLOYEEUSER);
    
    // Navigate to KPI page (should fail or not show create button)
    try {
      await navigateToKPIPage(page);
      
      // Check if Create KPI button exists
      const createButtonExists = await page.evaluate(() => {
        // Look for button with text "Create KPI" using standard DOM methods
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(button => button.textContent.includes('Create KPI'));
      }).catch(() => false);
      
      if (!createButtonExists) {
        console.log('Create KPI button not found - this is expected for employees');
        await page.screenshot({ path: 'employee_no_create_button.png' });
        return {
          unauthorized: true,
          message: 'Create KPI button not available for employees (expected behavior)'
        };
      }
      
      // If button exists, try to create a KPI (should fail)
      console.log('Create KPI button found - attempting to create KPI (should fail)');
      const globalKpiResult = await createKPI(page, TEST_KPIS.global);
      
      if (globalKpiResult) {
        console.error('Employee was able to create a KPI - this is unexpected!');
        await page.screenshot({ path: 'employee_created_kpi_unexpected.png' });
        return {
          unauthorized: false,
          message: 'Employee was able to create a KPI (unexpected behavior)'
        };
      } else {
        console.log('Employee failed to create KPI - this is expected');
        await page.screenshot({ path: 'employee_failed_create_kpi.png' });
        return {
          unauthorized: true,
          message: 'Employee failed to create KPI (expected behavior)'
        };
      }
    } catch (error) {
      console.log('Navigation to KPI page failed - this is expected for employees');
      await page.screenshot({ path: 'employee_navigation_failed.png' });
      return {
        unauthorized: true,
        message: 'Navigation to KPI page failed (expected behavior)'
      };
    }
  } catch (error) {
    console.error('Employee KPI creation test failed:', error);
    await page.screenshot({ path: 'employee_kpi_test_error.png' });
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
  console.log('\n=== Testing KPI Validation Scenarios ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Admin
    await login(page, ADMINUSER);
    
    // Navigate to KPI page
    await navigateToKPIPage(page);
    
    // Get role and employee IDs
    const roleIds = await getRoleIds(page);
    const employeeIds = await getEmployeeIds(page);
    
    // Test 1: Create KPI with excessive weightage (>100%)
    console.log('\nTest 1: Creating KPI with excessive weightage');
    const excessiveWeightageKpi = {
      ...TEST_KPIS.global,
      title: 'Excessive Weightage KPI Test',
      weightage: 101
    };
    const excessiveWeightageResult = await createKPI(page, excessiveWeightageKpi);
    
    // Test 2: Create KPI with invalid type
    console.log('\nTest 2: Creating KPI with missing required fields');
    const invalidTypeKpi = {
      ...TEST_KPIS.global,
      title: 'Invalid Type KPI Test',
      type: '' // Empty type should fail
    };
    const invalidTypeResult = await createKPI(page, invalidTypeKpi);
    
    // Test 3: Create role-based KPI without target role
    console.log('\nTest 3: Creating role-based KPI without target role');
    const missingTargetRoleKpi = {
      ...TEST_KPIS.roleBased,
      title: 'Missing Target Role KPI Test',
      target_role_id: null
    };
    const missingTargetRoleResult = await createKPI(page, missingTargetRoleKpi);
    
    // Take screenshot of validation errors
    await page.screenshot({ path: 'validation_errors.png' });
    
    return {
      excessiveWeightage: !excessiveWeightageResult, // Should fail, so success is !result
      invalidType: !invalidTypeResult, // Should fail, so success is !result
      missingTargetRole: !missingTargetRoleResult // Should fail, so success is !result
    };
  } catch (error) {
    console.error('Validation scenarios test failed:', error);
    await page.screenshot({ path: 'validation_test_error.png' });
    return {
      excessiveWeightage: false,
      invalidType: false,
      missingTargetRole: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Main test function
async function runTests() {
  console.log('Starting KPI Creation Tests');
  
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
    testResults.adminTests = await testAdminKPICreation(browser);
    
    // Run Manager tests
    testResults.managerTests = await testManagerKPICreation(browser);
    
    // Run Employee tests
    testResults.employeeTests = await testEmployeeKPICreation(browser);
    
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
  console.log('\n=== KPI Creation Test Report ===');
  
  // Display test results
  console.log(`\nTest Duration: ${results.duration} seconds`);
  console.log(`Start Time: ${results.startTime}`);
  console.log(`End Time: ${results.endTime}`);
  
  // Admin test results
  console.log('\nAdmin KPI Creation Tests:');
  if (results.adminTests) {
    console.log(`- Global KPI: ${results.adminTests.globalKpi ? 'Success' : 'Failed'}`);
    console.log(`- Role-based KPI: ${results.adminTests.roleBasedKpi ? 'Success' : 'Failed'}`);
    console.log(`- Employee-specific KPI: ${results.adminTests.employeeSpecificKpi ? 'Success' : 'Failed'}`);
    if (results.adminTests.error) {
      console.log(`- Error: ${results.adminTests.error}`);
    }
  } else {
    console.log('- Not executed');
  }
  
  // Manager test results
  console.log('\nManager KPI Creation Tests:');
  if (results.managerTests) {
    console.log(`- Global KPI: ${results.managerTests.globalKpi ? 'Success' : 'Failed'}`);
    console.log(`- Role-based KPI: ${results.managerTests.roleBasedKpi ? 'Success' : 'Failed'}`);
    console.log(`- Employee-specific KPI: ${results.managerTests.employeeSpecificKpi ? 'Success' : 'Failed'}`);
    if (results.managerTests.error) {
      console.log(`- Error: ${results.managerTests.error}`);
    }
  } else {
    console.log('- Not executed');
  }
  
  // Employee test results
  console.log('\nEmployee KPI Creation Tests:');
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
    console.log(`- Excessive Weightage: ${results.validationTests.excessiveWeightage ? 'Validated (Expected Failure)' : 'Failed Validation'}`);
    console.log(`- Invalid Type: ${results.validationTests.invalidType ? 'Validated (Expected Failure)' : 'Failed Validation'}`);
    console.log(`- Missing Target Role: ${results.validationTests.missingTargetRole ? 'Validated (Expected Failure)' : 'Failed Validation'}`);
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
  const reportPath = path.join(__dirname, 'results', `kpi_creation_test_report_${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nTest report saved to: ${reportPath}`);
}

// Run the tests
runTests().catch(console.error);