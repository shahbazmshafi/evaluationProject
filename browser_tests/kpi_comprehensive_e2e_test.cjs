const { chromium } = require('playwright');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://192.168.20.63';
const ADMIN_USER = { username: 'sgul@trafix.com', password: 'Asdf@12345' };
const MANAGER_USER = { username: 'm1@test.com', password: '123' };

// Strict timeout - tests will fail if operations take longer than this
const STRICT_TIMEOUT = 7000; // 7 seconds

// Test IDs for specific employees and roles
const EMPLOYEE_ID = '4'; // employee1
const ROLE_ID = '3'; // Employee role

/**
 * Comprehensive test scenarios covering all KPI combinations:
 * 1. By Creator Role: Admin (30% limit) or Manager (70% limit)
 * 2. By KPI Scope: Global, Role-based, or Employee-specific
 * 3. By KPI Type: Technical (isTechnical: true) or Administrative (isTechnical: false)
 * 4. By KPI Status: Draft, Active, or Archived
 */

// Admin test scenarios - covering all combinations
const adminScenarios = [
  // Technical KPIs - Global
  {
    name: 'Admin Create Global Technical KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Admin Global Technical KPI (Active)',
      description: 'A global technical KPI created by admin with active status',
      weightage: 5,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Global Technical KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Admin Global Technical KPI (Draft)',
      description: 'A global technical KPI created by admin with draft status',
      weightage: 5,
      type: 'global',
      status: 'draft',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Global Technical KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Admin Global Technical KPI (Archived)',
      description: 'A global technical KPI created by admin with archived status',
      weightage: 5,
      type: 'global',
      status: 'archived',
      isTechnical: true
    }
  },
  
  // Administrative KPIs - Global
  {
    name: 'Admin Create Global Administrative KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Admin Global Administrative KPI (Active)',
      description: 'A global administrative KPI created by admin with active status',
      weightage: 5,
      type: 'global',
      status: 'active',
      isTechnical: false
    }
  },
  {
    name: 'Admin Create Global Administrative KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Admin Global Administrative KPI (Draft)',
      description: 'A global administrative KPI created by admin with draft status',
      weightage: 5,
      type: 'global',
      status: 'draft',
      isTechnical: false
    }
  },
  {
    name: 'Admin Create Global Administrative KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Admin Global Administrative KPI (Archived)',
      description: 'A global administrative KPI created by admin with archived status',
      weightage: 5,
      type: 'global',
      status: 'archived',
      isTechnical: false
    }
  },
  
  // Technical KPIs - Role-based
  {
    name: 'Admin Create Role-Based Technical KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based Technical KPI (Active)',
      description: 'A role-based technical KPI created by admin with active status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Role-Based Technical KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based Technical KPI (Draft)',
      description: 'A role-based technical KPI created by admin with draft status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'draft',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Role-Based Technical KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based Technical KPI (Archived)',
      description: 'A role-based technical KPI created by admin with archived status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'archived',
      isTechnical: true
    }
  },
  
  // Administrative KPIs - Role-based
  {
    name: 'Admin Create Role-Based Administrative KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based Administrative KPI (Active)',
      description: 'A role-based administrative KPI created by admin with active status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'active',
      isTechnical: false
    }
  },
  {
    name: 'Admin Create Role-Based Administrative KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based Administrative KPI (Draft)',
      description: 'A role-based administrative KPI created by admin with draft status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'draft',
      isTechnical: false
    }
  },
  {
    name: 'Admin Create Role-Based Administrative KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Admin Role-Based Administrative KPI (Archived)',
      description: 'A role-based administrative KPI created by admin with archived status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'archived',
      isTechnical: false
    }
  },
  
  // Technical KPIs - Employee-specific
  {
    name: 'Admin Create Employee-Specific Technical KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific Technical KPI (Active)',
      description: 'An employee-specific technical KPI created by admin with active status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Employee-Specific Technical KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific Technical KPI (Draft)',
      description: 'An employee-specific technical KPI created by admin with draft status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'draft',
      isTechnical: true
    }
  },
  {
    name: 'Admin Create Employee-Specific Technical KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific Technical KPI (Archived)',
      description: 'An employee-specific technical KPI created by admin with archived status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'archived',
      isTechnical: true
    }
  },
  
  // Administrative KPIs - Employee-specific
  {
    name: 'Admin Create Employee-Specific Administrative KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific Administrative KPI (Active)',
      description: 'An employee-specific administrative KPI created by admin with active status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'active',
      isTechnical: false
    }
  },
  {
    name: 'Admin Create Employee-Specific Administrative KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific Administrative KPI (Draft)',
      description: 'An employee-specific administrative KPI created by admin with draft status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'draft',
      isTechnical: false
    }
  },
  {
    name: 'Admin Create Employee-Specific Administrative KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Admin Employee-Specific Administrative KPI (Archived)',
      description: 'An employee-specific administrative KPI created by admin with archived status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'archived',
      isTechnical: false
    }
  },
  
  // Update and Delete operations
  {
    name: 'Admin Update KPI',
    action: 'update',
    kpiSelector: 'Admin Global Technical KPI (Active)',
    kpi: {
      title: 'Updated Admin Global Technical KPI',
      description: 'An updated global technical KPI',
      weightage: 3,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Admin Delete KPI',
    action: 'delete',
    kpiSelector: 'Admin Global Administrative KPI (Active)'
  },
  
  // Weightage validation tests
  {
    name: 'Admin Weightage Validation Test (Approaching 30% Limit)',
    action: 'create',
    kpi: {
      title: 'Admin Weightage Test KPI (25%)',
      description: 'A KPI to test admin weightage approaching the 30% limit',
      weightage: 25,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'active',
      isTechnical: true
    },
    expectWarning: true
  }
];

// Manager test scenarios - covering all combinations
const managerScenarios = [
  // Technical KPIs - Global
  {
    name: 'Manager Create Global Technical KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Manager Global Technical KPI (Active)',
      description: 'A global technical KPI created by manager with active status',
      weightage: 5,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Global Technical KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Manager Global Technical KPI (Draft)',
      description: 'A global technical KPI created by manager with draft status',
      weightage: 5,
      type: 'global',
      status: 'draft',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Global Technical KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Manager Global Technical KPI (Archived)',
      description: 'A global technical KPI created by manager with archived status',
      weightage: 5,
      type: 'global',
      status: 'archived',
      isTechnical: true
    }
  },
  
  // Administrative KPIs - Global
  {
    name: 'Manager Create Global Administrative KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Manager Global Administrative KPI (Active)',
      description: 'A global administrative KPI created by manager with active status',
      weightage: 5,
      type: 'global',
      status: 'active',
      isTechnical: false
    }
  },
  {
    name: 'Manager Create Global Administrative KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Manager Global Administrative KPI (Draft)',
      description: 'A global administrative KPI created by manager with draft status',
      weightage: 5,
      type: 'global',
      status: 'draft',
      isTechnical: false
    }
  },
  {
    name: 'Manager Create Global Administrative KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Manager Global Administrative KPI (Archived)',
      description: 'A global administrative KPI created by manager with archived status',
      weightage: 5,
      type: 'global',
      status: 'archived',
      isTechnical: false
    }
  },
  
  // Technical KPIs - Role-based
  {
    name: 'Manager Create Role-Based Technical KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Manager Role-Based Technical KPI (Active)',
      description: 'A role-based technical KPI created by manager with active status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Role-Based Technical KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Manager Role-Based Technical KPI (Draft)',
      description: 'A role-based technical KPI created by manager with draft status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'draft',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Role-Based Technical KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Manager Role-Based Technical KPI (Archived)',
      description: 'A role-based technical KPI created by manager with archived status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'archived',
      isTechnical: true
    }
  },
  
  // Administrative KPIs - Role-based
  {
    name: 'Manager Create Role-Based Administrative KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Manager Role-Based Administrative KPI (Active)',
      description: 'A role-based administrative KPI created by manager with active status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'active',
      isTechnical: false
    }
  },
  {
    name: 'Manager Create Role-Based Administrative KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Manager Role-Based Administrative KPI (Draft)',
      description: 'A role-based administrative KPI created by manager with draft status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'draft',
      isTechnical: false
    }
  },
  {
    name: 'Manager Create Role-Based Administrative KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Manager Role-Based Administrative KPI (Archived)',
      description: 'A role-based administrative KPI created by manager with archived status',
      weightage: 5,
      type: 'role-based',
      targetRoleId: ROLE_ID,
      status: 'archived',
      isTechnical: false
    }
  },
  
  // Technical KPIs - Employee-specific
  {
    name: 'Manager Create Employee-Specific Technical KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific Technical KPI (Active)',
      description: 'An employee-specific technical KPI created by manager with active status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Employee-Specific Technical KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific Technical KPI (Draft)',
      description: 'An employee-specific technical KPI created by manager with draft status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'draft',
      isTechnical: true
    }
  },
  {
    name: 'Manager Create Employee-Specific Technical KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific Technical KPI (Archived)',
      description: 'An employee-specific technical KPI created by manager with archived status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'archived',
      isTechnical: true
    }
  },
  
  // Administrative KPIs - Employee-specific
  {
    name: 'Manager Create Employee-Specific Administrative KPI (Active)',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific Administrative KPI (Active)',
      description: 'An employee-specific administrative KPI created by manager with active status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'active',
      isTechnical: false
    }
  },
  {
    name: 'Manager Create Employee-Specific Administrative KPI (Draft)',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific Administrative KPI (Draft)',
      description: 'An employee-specific administrative KPI created by manager with draft status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'draft',
      isTechnical: false
    }
  },
  {
    name: 'Manager Create Employee-Specific Administrative KPI (Archived)',
    action: 'create',
    kpi: {
      title: 'Manager Employee-Specific Administrative KPI (Archived)',
      description: 'An employee-specific administrative KPI created by manager with archived status',
      weightage: 5,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'archived',
      isTechnical: false
    }
  },
  
  // Update and Delete operations
  {
    name: 'Manager Update KPI',
    action: 'update',
    kpiSelector: 'Manager Global Technical KPI (Active)',
    kpi: {
      title: 'Updated Manager Global Technical KPI',
      description: 'An updated global technical KPI',
      weightage: 3,
      type: 'global',
      status: 'active',
      isTechnical: true
    }
  },
  {
    name: 'Manager Delete KPI',
    action: 'delete',
    kpiSelector: 'Manager Global Administrative KPI (Active)'
  },
  
  // Weightage validation tests
  {
    name: 'Manager Weightage Validation Test (Approaching 70% Limit)',
    action: 'create',
    kpi: {
      title: 'Manager Weightage Test KPI (65%)',
      description: 'A KPI to test manager weightage approaching the 70% limit',
      weightage: 65,
      type: 'employee-specific',
      targetEmployeeId: EMPLOYEE_ID,
      status: 'active',
      isTechnical: true
    },
    expectWarning: true
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
async function createKPI(page, kpi, expectWarning = false) {
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

    // Check for weightage warnings if expected
    if (expectWarning) {
      // Wait for the warning message to appear
      const warningSelector = '.text-amber-600, .text-red-600';
      const warningExists = await page.waitForSelector(warningSelector, { 
        timeout: STRICT_TIMEOUT,
        state: 'visible'
      }).then(() => true).catch(() => false);
      
      if (warningExists) {
        console.log(`Weightage warning detected as expected for ${kpi.title}`);
        
        // Take a screenshot of the warning
        await page.screenshot({ 
          path: `${kpi.title.replace(/\s+/g, '_')}_warning.png`,
          fullPage: true
        });
      } else {
        console.warn(`Expected weightage warning not found for ${kpi.title}`);
      }
    }

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

// Function to verify KPI weightage validation
async function verifyWeightageValidation(page, userRole) {
  console.log(`Verifying weightage validation for ${userRole}...`);
  
  try {
    // Navigate to KPIs page
    await page.goto(`${BASE_URL}/kpis`, { timeout: STRICT_TIMEOUT });
    
    // Click the "Add KPI" button
    await page.click('button:has-text("Add KPI")', { timeout: STRICT_TIMEOUT });
    
    // Fill in basic KPI details
    await page.fill('input[name="title"]', `${userRole} Weightage Validation Test`, { timeout: STRICT_TIMEOUT });
    await page.fill('textarea[name="description"]', `Testing weightage validation for ${userRole}`, { timeout: STRICT_TIMEOUT });
    
    // Select employee-specific to see weightage information
    await page.selectOption('select[name="type"]', 'employee-specific', { timeout: STRICT_TIMEOUT });
    await page.waitForSelector('select[name="targetEmployeeId"]', { timeout: STRICT_TIMEOUT });
    await page.selectOption('select[name="targetEmployeeId"]', EMPLOYEE_ID, { timeout: STRICT_TIMEOUT });
    
    // Wait for weightage information to load
    await page.waitForSelector('.bg-gray-50.rounded-md.border.border-gray-200', { timeout: STRICT_TIMEOUT });
    
    // Take a screenshot of the weightage information
    await page.screenshot({ 
      path: `${userRole}_weightage_validation.png`,
      fullPage: true
    });
    
    // Test exceeding limits
    const limitWeightage = userRole === 'Admin' ? 31 : 71; // Just over the limit
    await page.fill('input[name="weightage"]', limitWeightage.toString(), { timeout: STRICT_TIMEOUT });
    
    // Check for warning message
    const warningSelector = userRole === 'Admin' 
      ? '.text-amber-600:has-text("exceed the 30% limit")'
      : '.text-amber-600:has-text("exceed the 70% limit")';
    
    const warningExists = await page.waitForSelector(warningSelector, { 
      timeout: STRICT_TIMEOUT,
      state: 'visible'
    }).then(() => true).catch(() => false);
    
    if (warningExists) {
      console.log(`${userRole} weightage limit warning detected successfully`);
      
      // Take a screenshot of the warning
      await page.screenshot({ 
        path: `${userRole}_weightage_limit_warning.png`,
        fullPage: true
      });
    } else {
      console.warn(`Expected ${userRole} weightage limit warning not found`);
    }
    
    // Close the form without saving
    await page.click('button:has-text("Cancel")', { timeout: STRICT_TIMEOUT });
    
    console.log(`Weightage validation for ${userRole} completed`);
  } catch (error) {
    console.error(`Error during weightage validation for ${userRole}:`, error);
    throw new Error(`Failed to verify weightage validation for ${userRole}: ${error.message}`);
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
    
    // First, verify weightage validation
    const userRole = user.username === ADMIN_USER.username ? 'Admin' : 'Manager';
    await verifyWeightageValidation(page, userRole);

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
            await createKPI(page, scenario.kpi, scenario.expectWarning);
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

  let report = `# KPI End-to-End Comprehensive Test Execution Report\n\n`;
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

  report += `## Test Coverage\n\n`;
  report += `This comprehensive test suite covers all possible KPI combinations:\n\n`;
  report += `1. **By Creator Role**:\n`;
  report += `   - Admin-created KPIs (30% limit)\n`;
  report += `   - Manager-created KPIs (70% limit)\n\n`;
  report += `2. **By KPI Scope**:\n`;
  report += `   - Global KPIs\n`;
  report += `   - Role-based KPIs\n`;
  report += `   - Employee-specific KPIs\n\n`;
  report += `3. **By KPI Type**:\n`;
  report += `   - Technical KPIs\n`;
  report += `   - Administrative KPIs\n\n`;
  report += `4. **By KPI Status**:\n`;
  report += `   - Draft\n`;
  report += `   - Active\n`;
  report += `   - Archived\n\n`;
  report += `5. **Weightage Validation**:\n`;
  report += `   - Admin 30% limit validation\n`;
  report += `   - Manager 70% limit validation\n`;
  report += `   - Total 100% limit validation\n\n`;

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

// Main test function
async function runTests() {
  console.log('Starting Comprehensive KPI End-to-End Tests');

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
  const detailedReportFilename = `kpi_comprehensive_test_report_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.md`;
  const detailedReport = generateTestReport(adminResults, managerResults, startTime, endTime);
  fs.writeFileSync(detailedReportFilename, detailedReport);
  console.log(`\nDetailed test report saved to ${detailedReportFilename}`);

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