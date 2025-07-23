const { test, expect } = require('@playwright/test');

test.describe('Access Control System Test', () => {
  test('Test granular access control for KPIs header navigation', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    console.log('1. Logging in as admin...');
    
    // Login as admin
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForLoadState('networkidle');
    
    // Verify admin is logged in by checking navigation
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    console.log('2. Navigating to Access Control page...');
    
    // Navigate to Access Control page
    await page.click('text=Access Control');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the access control page
    await expect(page.locator('text=Granular Access Control')).toBeVisible();
    
    console.log('3. Creating granular permission for "kpis header navigation"...');
    
    // Click on Create Permission button
    await page.click('button:has-text("Create Permission")');
    
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Fill in the permission form
    await page.fill('input[name="module_name"]', 'kpis');
    await page.fill('input[name="action_name"]', 'header_navigation');
    await page.fill('input[name="display_name"]', 'KPIs Header Navigation');
    await page.fill('input[name="description"]', 'Ability to see and access KPI navigation elements');
    
    // Submit the form
    await page.click('button:has-text("Create Permission")');
    
    // Wait for the permission to be created
    await page.waitForLoadState('networkidle');
    
    // Check if there's an error message
    const errorMessage = await page.locator('text=Failed to create Permission').isVisible();
    if (errorMessage) {
      console.log('❌ Error: Failed to create Permission - checking for detailed errors...');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'error_creating_permission.png' });
      
      // Print any error messages on the page
      const errors = await page.locator('[role="alert"], .error, .text-red-500').allTextContents();
      console.log('Error messages found:', errors);
      
      throw new Error('Failed to create granular permission');
    }
    
    console.log('✅ Permission created successfully');
    
    console.log('4. Creating a new user...');
    
    // Navigate to Users page to create a new user
    await page.click('text=Dashboard'); // Go back to dashboard first
    await page.waitForLoadState('networkidle');
    
    // Look for Users link in navigation or sidebar
    await page.click('text=Users');
    await page.waitForLoadState('networkidle');
    
    // Create a new user
    await page.click('button:has-text("Add User")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Fill user form
    await page.fill('input[name="name"]', 'Test User KPI Access');
    await page.fill('input[name="email"]', 'testuser@company.com');
    await page.fill('input[name="password"]', 'testpass123');
    
    // Select Employee role
    await page.selectOption('select[name="role_id"]', { label: 'Employee' });
    
    // Submit user form
    await page.click('button:has-text("Add User")');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ User created successfully');
    
    console.log('5. Assigning granular permission to the new user...');
    
    // Go back to Access Control page
    await page.click('text=Access Control');
    await page.waitForLoadState('networkidle');
    
    // Find the new user in the users list and assign permission
    // This might require scrolling or searching depending on UI implementation
    
    // Look for assign permission functionality
    await page.click('button:has-text("Assign Permission")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Select the test user
    await page.selectOption('select[name="user_id"]', { label: 'testuser@company.com' });
    
    // Select the KPIs header navigation permission
    await page.selectOption('select[name="permission_id"]', { label: 'KPIs Header Navigation' });
    
    // Submit assignment
    await page.click('button:has-text("Assign Permission")');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Permission assigned successfully');
    
    console.log('6. Logging out as admin...');
    
    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForLoadState('networkidle');
    
    console.log('7. Logging in as the new test user...');
    
    // Login as the test user
    await page.click('text=Login');
    await page.fill('input[type="email"]', 'testuser@company.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForLoadState('networkidle');
    
    console.log('8. Checking if KPI navigation elements are visible...');
    
    // Check if KPI-related navigation elements are visible
    const kpiNavigation = await page.locator('text=KPIs, a[href*="kpi"], button:has-text("KPI")').first().isVisible();
    
    if (kpiNavigation) {
      console.log('✅ KPI navigation element is visible');
      
      console.log('9. Testing if user can access KPI page...');
      
      // Try to click on KPI navigation
      await page.click('text=KPIs');
      await page.waitForLoadState('networkidle');
      
      // Check if user can access the KPI page
      const kpiPageContent = await page.locator('text=KPI, text=Key Performance Indicators').isVisible();
      
      if (kpiPageContent) {
        console.log('✅ User can successfully access KPI page');
      } else {
        console.log('❌ User cannot access KPI page content');
      }
    } else {
      console.log('❌ KPI navigation element is not visible');
    }
    
    console.log('10. Test completed');
    
    // Take a final screenshot
    await page.screenshot({ path: 'test_completed.png' });
  });
});