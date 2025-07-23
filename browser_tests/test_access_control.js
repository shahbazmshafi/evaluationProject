const { test, expect } = require('@playwright/test');

test.describe('Access Control System Test', () => {
  test('Test granular access control for KPIs header navigation', async ({ page }) => {
    // Set longer timeout for this test
    test.setTimeout(60000);
    
    console.log('🚀 Starting Playwright test for granular access control...');
    
    try {
      // Navigate to the application
      await page.goto('http://localhost:5173');
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      console.log('1. Logging in as test user...');
      
      // Login as the test user who has granular permission
      await page.click('text=Login');
      await page.fill('input[type="email"]', 'testuser2@company.com');
      await page.fill('input[type="password"]', 'testpass123');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForLoadState('networkidle');
      
      // Verify login success by checking for dashboard or navigation
      await expect(page.locator('text=Dashboard, nav, header')).toBeVisible();
      
      console.log('2. Checking if KPI navigation is visible...');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'after_login.png' });
      
      // Look for KPI navigation element
      const kpiNavigation = page.locator('a[href="/kpis"], text=KPIs, button:has-text("KPI")').first();
      
      // Wait a bit for async permission checking to complete
      await page.waitForTimeout(3000);
      
      // Check if KPI navigation is visible
      const isKPIVisible = await kpiNavigation.isVisible();
      
      if (isKPIVisible) {
        console.log('✅ KPI navigation element is visible!');
        
        console.log('3. Testing if user can access KPI page...');
        
        // Click on KPI navigation
        await kpiNavigation.click();
        await page.waitForLoadState('networkidle');
        
        // Check if user can access the KPI page
        const kpiPageContent = page.locator('text=KPI, text=Key Performance Indicators, h1, h2').first();
        await expect(kpiPageContent).toBeVisible();
        
        console.log('✅ User can successfully access KPI page!');
        
        // Take a screenshot of the KPI page
        await page.screenshot({ path: 'kpi_page_access.png' });
      } else {
        console.log('❌ KPI navigation element is not visible');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'no_kpi_navigation.png' });
        
        // List all visible navigation elements for debugging
        const navElements = await page.locator('nav a, nav button').allTextContents();
        console.log('Visible navigation elements:', navElements);
        
        throw new Error('KPI navigation should be visible for user with granular permission');
      }
      
      console.log('4. Test completed successfully!');
      
      // Take a final screenshot
      await page.screenshot({ path: 'test_completed.png' });
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      
      // Take a screenshot of the error state
      await page.screenshot({ path: 'test_error.png' });
      
      throw error;
    }
  });
  
  test('Test granular access control - user without permission', async ({ page }) => {
    // Set longer timeout for this test
    test.setTimeout(60000);
    
    console.log('🚀 Testing user WITHOUT granular permission...');
    
    try {
      // Navigate to the application
      await page.goto('http://localhost:5173');
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      console.log('1. Logging in as regular user (without KPI granular permission)...');
      
      // First create a user without the granular permission
      // Login as admin first to create a user
      await page.click('text=Login');
      await page.fill('input[type="email"]', 'admin@company.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for admin login
      await page.waitForLoadState('networkidle');
      
      // Logout admin
      await page.click('button:has-text("Logout"), text=Logout');
      await page.waitForLoadState('networkidle');
      
      // Login as a regular employee without granular permission
      await page.click('text=Login');
      await page.fill('input[type="email"]', 'employee@company.com');
      await page.fill('input[type="password"]', 'employee123');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForLoadState('networkidle');
      
      console.log('2. Checking if KPI navigation is hidden...');
      
      // Wait a bit for async permission checking to complete
      await page.waitForTimeout(3000);
      
      // Look for KPI navigation element
      const kpiNavigation = page.locator('a[href="/kpis"], text=KPIs, button:has-text("KPI")').first();
      
      // Check if KPI navigation is NOT visible
      const isKPIVisible = await kpiNavigation.isVisible();
      
      if (!isKPIVisible) {
        console.log('✅ KPI navigation is correctly hidden for user without permission!');
      } else {
        console.log('❌ KPI navigation should be hidden for user without granular permission');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'kpi_should_be_hidden.png' });
        
        throw new Error('KPI navigation should be hidden for user without granular permission');
      }
      
      console.log('3. Test completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      await page.screenshot({ path: 'test_no_permission_error.png' });
      throw error;
    }
  });
});