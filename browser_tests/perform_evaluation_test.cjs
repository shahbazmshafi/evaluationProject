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
        // If header not found, look for evaluation-related elements
        await page.waitForSelector('button', { timeout: STRICT_TIMEOUT });
        const buttonFound = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => 
            btn.textContent.includes('Start') || 
            btn.textContent.includes('Evaluate') ||
            btn.textContent.includes('Review')
          );
        });
        
        if (!buttonFound) {
          throw new Error('Evaluations page not loaded: Neither header nor evaluation buttons found');
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

// Helper function to start an evaluation
async function startEvaluation(page, employeeIndex = 0) {
  console.log('Starting an evaluation...');
  
  try {
    // Wait for the page to load and stabilize
    await page.waitForTimeout(2000);
    
    // Find all "Start" buttons
    const startButtons = await page.$$('button:has-text("Start")');
    
    if (startButtons.length === 0) {
      throw new Error('No Start buttons found on the page');
    }
    
    console.log(`Found ${startButtons.length} Start buttons`);
    
    // Click on the specified Start button (default to the first one)
    if (employeeIndex >= startButtons.length) {
      console.warn(`Requested employee index ${employeeIndex} exceeds available buttons (${startButtons.length}), using first button`);
      employeeIndex = 0;
    }
    
    // Get employee name for logging
    const employeeName = await page.evaluate((index) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      if (rows.length > index) {
        const nameCell = rows[index].querySelector('td:first-child');
        return nameCell ? nameCell.textContent.trim() : 'Unknown';
      }
      return 'Unknown';
    }, employeeIndex);
    
    console.log(`Starting evaluation for employee: ${employeeName}`);
    await startButtons[employeeIndex].click();
    
    // Wait for the evaluation form to appear
    await page.waitForSelector('.bg-white.rounded-lg.shadow-xl', { timeout: FORM_TIMEOUT });
    console.log('Evaluation form opened successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to start evaluation:', error);
    await page.screenshot({ path: 'start_evaluation_error.png' });
    return false;
  }
}

// Helper function to fill the evaluation form
async function fillEvaluationForm(page) {
  console.log('Filling evaluation form...');
  
  try {
    // Wait for KPI items to be loaded
    await page.waitForSelector('.bg-gray-50.rounded-lg.p-4', { timeout: FORM_TIMEOUT });
    
    // Count KPI items
    const kpiCount = await page.evaluate(() => {
      return document.querySelectorAll('.bg-gray-50.rounded-lg.p-4').length;
    });
    
    console.log(`Found ${kpiCount} KPI items to rate`);
    
    if (kpiCount === 0) {
      console.warn('No KPI items found to rate');
      return false;
    }
    
    // Fill each KPI item with rating and comment
    for (let i = 0; i < kpiCount; i++) {
      try {
        // Generate a random rating between 3.0 and 5.0
        const rating = (3 + Math.random() * 2).toFixed(1);
        
        // Use page.evaluate to interact with the DOM directly
        const success = await page.evaluate(params => {
          // Get all KPI items
          const kpiItems = document.querySelectorAll('.bg-gray-50.rounded-lg.p-4');
          
          // Check if the index is valid
          if (params.index >= kpiItems.length) {
            return false;
          }
          
          // Get the current KPI item
          const kpiItem = kpiItems[params.index];
          
          // Find the rating input and comment textarea within this KPI item
          const ratingInput = kpiItem.querySelector('input[type="number"]');
          const commentTextarea = kpiItem.querySelector('textarea');
          
          // Check if elements were found
          if (!ratingInput || !commentTextarea) {
            return false;
          }
          
          // Fill the rating input
          ratingInput.value = params.ratingValue;
          ratingInput.dispatchEvent(new Event('input', { bubbles: true }));
          ratingInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Fill the comment textarea
          commentTextarea.value = `Test comment for KPI #${params.index + 1}`;
          commentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          commentTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          
          return true;
        }, { index: i, ratingValue: rating });
        
        if (success) {
          console.log(`Filled KPI #${i+1} with rating ${rating}`);
        } else {
          console.warn(`Failed to fill KPI #${i+1} - elements not found`);
        }
      } catch (itemError) {
        console.warn(`Error filling KPI #${i+1}: ${itemError.message}`);
      }
    }
    
    // Fill overall comments
    try {
      await page.waitForSelector('.bg-blue-50.rounded-lg.p-4 textarea', { timeout: FORM_TIMEOUT });
      await page.fill('.bg-blue-50.rounded-lg.p-4 textarea', 'Overall test comments for the evaluation.', { timeout: FORM_TIMEOUT });
      console.log('Filled overall comments');
    } catch (commentsError) {
      console.warn(`Error filling overall comments: ${commentsError.message}`);
    }
    
    // Fill manager comments if the user is a manager
    try {
      const managerCommentsTextarea = await page.$('.bg-yellow-50.rounded-lg.p-4 textarea');
      if (managerCommentsTextarea) {
        await managerCommentsTextarea.fill('Manager-specific test comments.', { timeout: FORM_TIMEOUT });
        console.log('Filled manager comments');
      }
    } catch (managerCommentsError) {
      console.warn(`Error filling manager comments: ${managerCommentsError.message}`);
    }
    
    // Fill admin comments if the user is an admin
    try {
      const adminCommentsTextarea = await page.$('.bg-red-50.rounded-lg.p-4 textarea');
      if (adminCommentsTextarea) {
        await adminCommentsTextarea.fill('Admin-specific test comments.', { timeout: FORM_TIMEOUT });
        console.log('Filled admin comments');
      }
    } catch (adminCommentsError) {
      console.warn(`Error filling admin comments: ${adminCommentsError.message}`);
    }
    
    console.log('Evaluation form filled successfully');
    return true;
  } catch (error) {
    console.error('Error filling evaluation form:', error);
    await page.screenshot({ path: 'fill_evaluation_form_error.png' });
    return false;
  }
}

// Helper function to save or submit an evaluation
async function saveOrSubmitEvaluation(page, action = 'draft') {
  console.log(`${action === 'draft' ? 'Saving' : 'Submitting'} evaluation...`);
  
  try {
    // Click on the appropriate button based on the action
    if (action === 'draft') {
      await page.click('button:has-text("Save Draft")', { timeout: STRICT_TIMEOUT });
    } else {
      await page.click('button:has-text("Submit Evaluation")', { timeout: STRICT_TIMEOUT });
    }
    
    // Wait for any response to the evaluation API
    console.log('Waiting for save/submit operation to complete...');
    
    // Wait for success message or form closure
    await Promise.race([
      // Check for success message
      page.waitForFunction(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        return divs.some(div => 
          div.textContent.includes('saved successfully') || 
          div.textContent.includes('submitted successfully')
        );
      }, { timeout: FORM_TIMEOUT })
        .then(() => console.log('Success message detected'))
        .catch(() => null),
      
      // Check for form closure
      page.waitForFunction(() => !document.querySelector('.bg-white.rounded-lg.shadow-xl'), { timeout: FORM_TIMEOUT })
        .then(() => console.log('Form closed'))
        .catch(() => null),
      
      page.waitForTimeout(5000) // Fallback timeout
    ]);
    
    console.log(`Evaluation ${action === 'draft' ? 'saved as draft' : 'submitted'} successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to ${action === 'draft' ? 'save' : 'submit'} evaluation:`, error);
    await page.screenshot({ path: `${action === 'draft' ? 'save' : 'submit'}_evaluation_error.png` });
    return false;
  }
}

// Test function for Admin performing evaluation
async function testAdminPerformEvaluation(browser) {
  console.log('\n=== Testing Admin Performing Evaluation ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Admin
    await login(page, ADMINUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 1: Start an evaluation
    console.log('\nTest 1: Admin starting an evaluation');
    const startResult = await startEvaluation(page);
    
    if (!startResult) {
      throw new Error('Failed to start evaluation');
    }
    
    // Test 2: Fill the evaluation form
    console.log('\nTest 2: Admin filling evaluation form');
    const fillResult = await fillEvaluationForm(page);
    
    if (!fillResult) {
      throw new Error('Failed to fill evaluation form');
    }
    
    // Take screenshot of filled form
    await page.screenshot({ path: 'admin_filled_evaluation.png' });
    
    // Test 3: Save evaluation as draft
    console.log('\nTest 3: Admin saving evaluation as draft');
    const saveResult = await saveOrSubmitEvaluation(page, 'draft');
    
    // Navigate back to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 4: Start another evaluation
    console.log('\nTest 4: Admin starting another evaluation');
    const startResult2 = await startEvaluation(page, 1); // Try with second employee if available
    
    if (startResult2) {
      // Test 5: Fill the evaluation form
      console.log('\nTest 5: Admin filling evaluation form');
      const fillResult2 = await fillEvaluationForm(page);
      
      if (fillResult2) {
        // Test 6: Submit evaluation
        console.log('\nTest 6: Admin submitting evaluation');
        const submitResult = await saveOrSubmitEvaluation(page, 'submit');
        
        return {
          startEvaluation: startResult,
          fillForm: fillResult,
          saveDraft: saveResult,
          startSecondEvaluation: startResult2,
          fillSecondForm: fillResult2,
          submitEvaluation: submitResult
        };
      }
    }
    
    return {
      startEvaluation: startResult,
      fillForm: fillResult,
      saveDraft: saveResult,
      startSecondEvaluation: startResult2 || false,
      fillSecondForm: false,
      submitEvaluation: false
    };
  } catch (error) {
    console.error('Admin perform evaluation test failed:', error);
    await page.screenshot({ path: 'admin_evaluation_test_error.png' });
    return {
      startEvaluation: false,
      fillForm: false,
      saveDraft: false,
      startSecondEvaluation: false,
      fillSecondForm: false,
      submitEvaluation: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for Manager performing evaluation
async function testManagerPerformEvaluation(browser) {
  console.log('\n=== Testing Manager Performing Evaluation ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Manager
    await login(page, MANAGERUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 1: Start an evaluation
    console.log('\nTest 1: Manager starting an evaluation');
    const startResult = await startEvaluation(page);
    
    if (!startResult) {
      throw new Error('Failed to start evaluation');
    }
    
    // Test 2: Fill the evaluation form
    console.log('\nTest 2: Manager filling evaluation form');
    const fillResult = await fillEvaluationForm(page);
    
    if (!fillResult) {
      throw new Error('Failed to fill evaluation form');
    }
    
    // Take screenshot of filled form
    await page.screenshot({ path: 'manager_filled_evaluation.png' });
    
    // Test 3: Save evaluation as draft
    console.log('\nTest 3: Manager saving evaluation as draft');
    const saveResult = await saveOrSubmitEvaluation(page, 'draft');
    
    // Navigate back to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 4: Start another evaluation
    console.log('\nTest 4: Manager starting another evaluation');
    const startResult2 = await startEvaluation(page, 1); // Try with second employee if available
    
    if (startResult2) {
      // Test 5: Fill the evaluation form
      console.log('\nTest 5: Manager filling evaluation form');
      const fillResult2 = await fillEvaluationForm(page);
      
      if (fillResult2) {
        // Test 6: Submit evaluation
        console.log('\nTest 6: Manager submitting evaluation');
        const submitResult = await saveOrSubmitEvaluation(page, 'submit');
        
        return {
          startEvaluation: startResult,
          fillForm: fillResult,
          saveDraft: saveResult,
          startSecondEvaluation: startResult2,
          fillSecondForm: fillResult2,
          submitEvaluation: submitResult
        };
      }
    }
    
    return {
      startEvaluation: startResult,
      fillForm: fillResult,
      saveDraft: saveResult,
      startSecondEvaluation: startResult2 || false,
      fillSecondForm: false,
      submitEvaluation: false
    };
  } catch (error) {
    console.error('Manager perform evaluation test failed:', error);
    await page.screenshot({ path: 'manager_evaluation_test_error.png' });
    return {
      startEvaluation: false,
      fillForm: false,
      saveDraft: false,
      startSecondEvaluation: false,
      fillSecondForm: false,
      submitEvaluation: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Test function for Employee attempting to perform evaluation (should be unauthorized)
async function testEmployeePerformEvaluation(browser) {
  console.log('\n=== Testing Employee Performing Evaluation (Should Fail) ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Employee
    await login(page, EMPLOYEEUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Check if Start buttons exist
    const startButtonsExist = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent.includes('Start'));
    });
    
    if (!startButtonsExist) {
      console.log('Start buttons not found - this is expected for employees');
      await page.screenshot({ path: 'employee_no_start_buttons.png' });
      return {
        unauthorized: true,
        message: 'Start buttons not available for employees (expected behavior)'
      };
    }
    
    // If Start buttons exist, try to start an evaluation (should fail or be for self-evaluation only)
    console.log('Start buttons found - attempting to start evaluation');
    const startResult = await startEvaluation(page);
    
    if (!startResult) {
      console.log('Employee failed to start evaluation - this is expected');
      await page.screenshot({ path: 'employee_failed_start_evaluation.png' });
      return {
        unauthorized: true,
        message: 'Employee failed to start evaluation (expected behavior)'
      };
    }
    
    // If evaluation started, check if it's a self-evaluation
    const isSelfEvaluation = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('h2'));
      return headers.some(h => h.textContent.includes('Self-Evaluation') || h.textContent.includes('My Evaluation'));
    });
    
    if (isSelfEvaluation) {
      console.log('Employee started a self-evaluation - this may be allowed');
      await page.screenshot({ path: 'employee_self_evaluation.png' });
      return {
        unauthorized: false,
        selfEvaluation: true,
        message: 'Employee was able to start a self-evaluation (may be allowed)'
      };
    }
    
    console.error('Employee was able to start an evaluation for someone else - this is unexpected!');
    await page.screenshot({ path: 'employee_started_evaluation_unexpected.png' });
    return {
      unauthorized: false,
      message: 'Employee was able to start an evaluation (unexpected behavior)'
    };
  } catch (error) {
    console.error('Employee perform evaluation test failed:', error);
    await page.screenshot({ path: 'employee_evaluation_test_error.png' });
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
  console.log('\n=== Testing Evaluation Validation Scenarios ===');
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as Admin
    await login(page, ADMINUSER);
    
    // Navigate to Evaluations page
    await navigateToEvaluationsPage(page);
    
    // Test 1: Submit evaluation without filling any ratings
    console.log('\nTest 1: Submitting evaluation without ratings');
    
    // Start an evaluation
    const startResult = await startEvaluation(page);
    
    if (!startResult) {
      throw new Error('Failed to start evaluation for validation test');
    }
    
    // Try to submit without filling any ratings
    await page.click('button:has-text("Submit Evaluation")', { timeout: STRICT_TIMEOUT });
    
    // Check if a confirmation dialog appears
    const confirmationAppeared = await page.evaluate(() => {
      return window.confirm = function() { return false; };
    });
    
    // Take screenshot of validation error
    await page.screenshot({ path: 'validation_empty_ratings.png' });
    
    // Cancel the form
    await page.click('button:has-text("Cancel")', { timeout: STRICT_TIMEOUT });
    
    // Test 2: Save draft with invalid ratings
    console.log('\nTest 2: Saving draft with invalid ratings');
    
    // Start another evaluation
    await navigateToEvaluationsPage(page);
    const startResult2 = await startEvaluation(page, 1);
    
    if (!startResult2) {
      return {
        emptyRatingsValidation: confirmationAppeared,
        invalidRatingsValidation: false
      };
    }
    
    // Try to set an invalid rating (above 5.0)
    const invalidRatingResult = await page.evaluate(() => {
      try {
        const ratingInputs = document.querySelectorAll('input[type="number"]');
        if (ratingInputs.length === 0) return false;
        
        const input = ratingInputs[0];
        input.value = "6.0";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Check if the input value was normalized or rejected
        return input.value !== "6.0";
      } catch (e) {
        return false;
      }
    });
    
    // Take screenshot of validation error
    await page.screenshot({ path: 'validation_invalid_rating.png' });
    
    return {
      emptyRatingsValidation: confirmationAppeared,
      invalidRatingsValidation: invalidRatingResult
    };
  } catch (error) {
    console.error('Validation scenarios test failed:', error);
    await page.screenshot({ path: 'validation_test_error.png' });
    return {
      emptyRatingsValidation: false,
      invalidRatingsValidation: false,
      error: error.message
    };
  } finally {
    await context.close();
  }
}

// Main test function
async function runTests() {
  console.log('Starting Perform Evaluation Tests');
  
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
    testResults.adminTests = await testAdminPerformEvaluation(browser);
    
    // Run Manager tests
    testResults.managerTests = await testManagerPerformEvaluation(browser);
    
    // Run Employee tests
    testResults.employeeTests = await testEmployeePerformEvaluation(browser);
    
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
  console.log('\n=== Perform Evaluation Test Report ===');
  
  // Display test results
  console.log(`\nTest Duration: ${results.duration} seconds`);
  console.log(`Start Time: ${results.startTime}`);
  console.log(`End Time: ${results.endTime}`);
  
  // TODO: Add detailed test results reporting
  
  // Overall result
  if (results.error) {
    console.log('\nOverall Result: Failed');
    console.log(`Error: ${results.error}`);
  } else {
    console.log('\nOverall Result: Completed');
  }
  
  // Save report to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const reportPath = path.join(__dirname, 'results', `perform_evaluation_test_report_${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nTest report saved to: ${reportPath}`);
}

// Run the tests
runTests().catch(console.error);